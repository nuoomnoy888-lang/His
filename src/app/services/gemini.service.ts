import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

export interface AiCommand {
  deviceType: 'light' | 'ac' | 'lock' | 'tv' | 'curtain' | 'all';
  action: 'on' | 'off' | 'locked' | 'unlocked' | 'open' | 'closed' | 'status';
  location: string;
  value?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  async parseCommand(text: string): Promise<AiCommand> {
    const prompt = `
      คุณเป็นระบบควบคุมบ้านอัจฉริยะแบบสั่งงานด้วยเสียง (Smart Home Voice Controller)
      หน้าที่ของคุณคือตีความหมายจากคำสั่งเสียงภาษาไทยของผู้ใช้ให้เป็น JSON เพื่อสั่งงานอุปกรณ์
      
      คำสั่งเสียง: "${text}"

      กฎการตีความ:
      1. deviceType: 'light' (ไฟ), 'ac' (แอร์, เครื่องปรับอากาศ), 'lock' (ประตู), 'tv' (ทีวี), 'curtain' (ม่าน), 'all' (ทั้งหมด)
      2. action: 'on' (เปิด), 'off' (ปิด), 'locked' (ล็อค), 'unlocked' (ปลดล็อค), 'open' (เปิดม่าน/ประตู), 'closed' (ปิดม่าน/ประตู), 'status' (ตรวจสอบสถานะ)
      3. location: ชื่อห้อง เช่น 'ห้องนั่งเล่น', 'ห้องนอน', 'ห้องครัว', 'หน้าบ้าน' (ถ้าไม่ระบุให้เป็นค่าว่าง '')
      4. value: ถ้าเป็นการปรับอุณหภูมิแอร์ ให้ระบุตัวเลข (เช่น 25)

      คืนค่าเป็น JSON เท่านั้นในรูปแบบ:
      {
        "deviceType": "...",
        "action": "...",
        "location": "...",
        "value": number (optional)
      }

      ตัวอย่าง:
      "เปิดไฟห้องนั่งเล่น" -> {"deviceType": "light", "action": "on", "location": "ห้องนั่งเล่น"}
      "ร้อนจัง เปิดแอร์ห้องนอนหน่อย 22 องศา" -> {"deviceType": "ac", "action": "on", "location": "ห้องนอน", "value": 22}
      "ปิดไฟทุกดวง" -> {"deviceType": "all", "action": "off", "location": ""}
    `;

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      
      const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        throw new Error('No response from AI');
      }
      return JSON.parse(jsonText) as AiCommand;
    } catch (error) {
      console.error('Gemini error:', error);
      throw error;
    }
  }
}
