import { Injectable, signal, computed } from '@angular/core';

export interface SmartDevice {
  id: string;
  name: string;
  type: 'light' | 'ac' | 'lock' | 'tv' | 'curtain';
  location: string;
  status: 'on' | 'off' | 'locked' | 'unlocked' | 'open' | 'closed';
  value?: number; // temperature or brightness
  customIcon?: string; // Material icon name or image URL
  energyUsage?: number; // in Watts
}

@Injectable({
  providedIn: 'root'
})
export class SmartHomeService {
  private devices = signal<SmartDevice[]>([
    { id: '1', name: 'ไฟห้องนั่งเล่น', type: 'light', location: 'ห้องนั่งเล่น', status: 'off', customIcon: 'highlight', energyUsage: 0 },
    { id: '2', name: 'ไฟห้องครัว', type: 'light', location: 'ห้องครัว', status: 'off', energyUsage: 0 },
    { id: '3', name: 'ไฟห้องนอน', type: 'light', location: 'ห้องนอน', status: 'off', customIcon: 'bedtime', energyUsage: 0 },
    { id: '4', name: 'แอร์ห้องนั่งเล่น', type: 'ac', location: 'ห้องนั่งเล่น', status: 'off', value: 25, customIcon: 'wind_power', energyUsage: 0 },
    { id: '5', name: 'แอร์ห้องนอน', type: 'ac', location: 'ห้องนอน', status: 'off', value: 25, energyUsage: 0 },
    { id: '6', name: 'ประตูหน้าบ้าน', type: 'lock', location: 'หน้าบ้าน', status: 'locked', customIcon: 'security', energyUsage: 0 },
    { id: '7', name: 'ทีวี', type: 'tv', location: 'ห้องนั่งเล่น', status: 'off', customIcon: 'monitor', energyUsage: 0 },
    { id: '8', name: 'ผ้าม่าน', type: 'curtain', location: 'ห้องนอน', status: 'closed', customIcon: 'window', energyUsage: 0 },
  ]);

  readonly allDevices = computed(() => this.devices());
  
  readonly totalEnergy = computed(() => 
    this.devices().reduce((sum, d) => sum + (d.energyUsage || 0), 0)
  );

  updateDeviceStatus(id: string, status: SmartDevice['status'], value?: number) {
    this.devices.update(devices => devices.map(d => {
      if (d.id === id) {
        let usage = 0;
        if (status === 'on' || status === 'unlocked' || status === 'open') {
          // Mock energy consumption based on device type
          usage = d.type === 'ac' ? 850 : d.type === 'tv' ? 120 : d.type === 'light' ? 12 : 5;
        }
        return { ...d, status, value: value !== undefined ? value : d.value, energyUsage: usage };
      }
      return d;
    }));
  }

  updateDeviceIcon(id: string, customIcon: string) {
    this.devices.update(devices => devices.map(d => 
      d.id === id ? { ...d, customIcon } : d
    ));
  }

  findDeviceByContext(deviceType: string, location: string): SmartDevice | undefined {
    return this.devices().find(d => 
      (d.type === deviceType || d.name.includes(deviceType)) && 
      (location === '' || d.location.includes(location) || location.includes(d.location))
    );
  }

  // Bulk actions
  allLights(status: 'on' | 'off') {
    this.devices.update(devices => devices.map(d => 
      d.type === 'light' ? { ...d, status } : d
    ));
  }

  setAllOff() {
    this.devices.update(devices => devices.map(d => {
       if (d.type === 'lock') return d; // Don't unlock for safety usually
       return { ...d, status: d.type === 'curtain' ? 'closed' : 'off' };
    }));
  }
}
