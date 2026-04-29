import { ChangeDetectionStrategy, Component, inject, signal, viewChildren, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SmartHomeService, SmartDevice } from './services/smart-home.service';
import { SpeechService } from './services/speech.service';
import { GeminiService, AiCommand } from './services/gemini.service';
import { animate, stagger } from 'motion';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  smartHome = inject(SmartHomeService);
  speech = inject(SpeechService);
  gemini = inject(GeminiService);

  deviceElements = viewChildren<ElementRef>('deviceItem');
  logElements = viewChildren<ElementRef>('logItem');

  isAiProcessing = signal(false);
  isEditMode = signal(false);
  recentlyChangedDeviceIds = signal<Set<string>>(new Set());
  commandHistory = signal<{ text: string; action: string; time: Date }[]>([]);
  errorMessage = signal<string | null>(null);
  currentDate = new Date();

  constructor() {
    // Check if voice is supported on init
    if (!this.speech.isSupported()) {
      this.errorMessage.set('เบราว์เซอร์ของคุณไม่รองรับการสั่งงานด้วยเสียง');
    }
    
    setInterval(() => {
      this.currentDate = new Date();
    }, 10000);
  }

  ngAfterViewInit() {
    this.animateEntrance();
  }

  private animateEntrance() {
    const items = this.deviceElements().map(el => el.nativeElement);
    if (items.length > 0) {
      animate(
        items,
        { opacity: [0, 1], y: [20, 0], scale: [0.95, 1] },
        { delay: stagger(0.05), duration: 0.6, ease: 'easeOut' }
      );
    }
  }

  async startVoiceCommand() {
    this.errorMessage.set(null);
    try {
      const transcript = await this.speech.startListening();
      await this.processCommand(transcript);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage.set('เกิดข้อผิดพลาดในการรับเสียง: ' + msg);
    }
  }

  async processCommand(text: string) {
    this.isAiProcessing.set(true);
    try {
      const aiResponse = await this.gemini.parseCommand(text);
      this.executeAiCommand(text, aiResponse);
    } catch (err) {
      console.error(err);
      this.errorMessage.set('AI ไม่สามารถประมวลผลคำสั่งได้');
    } finally {
      this.isAiProcessing.set(false);
    }
  }

  executeAiCommand(originalText: string, cmd: AiCommand) {
    let actionDesc = '';

    if (cmd.deviceType === 'all') {
      if (cmd.action === 'off') {
        const affectedIds = this.smartHome.allDevices().filter(d => d.type !== 'lock').map(d => d.id);
        this.smartHome.setAllOff();
        this.triggerFeedback(affectedIds);
        actionDesc = 'ปิดอุปกรณ์ทั้งหมด (ยกเว้นประตู)';
      } else if (cmd.action === 'on') {
        const affectedIds = this.smartHome.allDevices().filter(d => d.type === 'light').map(d => d.id);
        this.smartHome.allLights('on');
        this.triggerFeedback(affectedIds);
        actionDesc = 'เปิดไฟทุกดวง';
      }
    } else {
      const device = this.smartHome.findDeviceByContext(cmd.deviceType, cmd.location);
      if (device) {
        let status: SmartDevice['status'] = 'off';
        
        if (device.type === 'lock') {
          status = (cmd.action === 'unlocked' || cmd.action === 'open' || cmd.action === 'on') ? 'unlocked' : 'locked';
        } else if (device.type === 'curtain') {
          status = (cmd.action === 'open' || cmd.action === 'on') ? 'open' : 'closed';
        } else {
          status = (cmd.action === 'on' || cmd.action === 'open') ? 'on' : 'off';
        }

        this.smartHome.updateDeviceStatus(device.id, status, cmd.value);
        this.triggerFeedback(device.id);
        
        const actionVerbMap: Record<string, string> = {
          'on': 'เปิด', 'off': 'ปิด', 
          'locked': 'ล็อค', 'unlocked': 'ปลดล็อค',
          'open': 'เปิด', 'closed': 'ปิด'
        };
        const actionVerb = actionVerbMap[status] || 'ปรับเปลี่ยน';
        
        actionDesc = `${actionVerb}${device.name}`;
        if (cmd.value && device.type === 'ac') actionDesc += ` ไปที่ ${cmd.value} องศา`;
        if (cmd.action === 'status') actionDesc = `สถานะ${device.name}คือ ${device.status}`;
      } else {
        actionDesc = `หาอุปกรณ์ ${cmd.deviceType} ใน ${cmd.location || 'บ้าน'} ไม่พบ`;
      }
    }

    this.commandHistory.update(h => [
      { text: originalText, action: actionDesc, time: new Date() },
      ...h.slice(0, 4)
    ]);
  }

  toggleDevice(device: SmartDevice) {
    if (this.isEditMode()) return;
    let newStatus: SmartDevice['status'] = device.status === 'on' ? 'off' : 'on';
    if (device.type === 'lock') newStatus = device.status === 'locked' ? 'unlocked' : 'locked';
    if (device.type === 'curtain') newStatus = device.status === 'open' ? 'closed' : 'open';
    this.smartHome.updateDeviceStatus(device.id, newStatus);
    this.triggerFeedback(device.id);
  }

  private triggerFeedback(id: string | string[]) {
    const ids = Array.isArray(id) ? id : [id];
    this.recentlyChangedDeviceIds.update(set => {
      const newSet = new Set(set);
      ids.forEach(i => newSet.add(i));
      return newSet;
    });

    setTimeout(() => {
      this.recentlyChangedDeviceIds.update(set => {
        const newSet = new Set(set);
        ids.forEach(i => newSet.delete(i));
        return newSet;
      });
    }, 600);
  }

  changeIcon(device: SmartDevice) {
    const newIcon = prompt('ป้อนชื่อ Material Icon (เช่น settings, home) หรือ URL ของรูปภาพ:', device.customIcon || '');
    if (newIcon !== null) {
      this.smartHome.updateDeviceIcon(device.id, newIcon.trim());
    }
  }
}
