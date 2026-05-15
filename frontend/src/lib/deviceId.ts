export function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

export type DeviceType = 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS' | 'Другое';

export function getDeviceType(): DeviceType {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const uaPlatform = (nav.userAgentData?.platform || '').toLowerCase();
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();

  // Android — проверяем до Linux, т.к. UA содержит "linux"
  if (/android/.test(ua) || uaPlatform === 'android') return 'Android';

  // iOS — iPhone/iPod, а также iPad на iPadOS (репортит как Mac, но имеет touch)
  if (/iphone|ipod|ipad/.test(ua)) return 'iOS';
  if (platform === 'macintel' && navigator.maxTouchPoints > 1) return 'iOS';

  if (/win/.test(ua) || uaPlatform === 'windows') return 'Windows';
  if (/mac/.test(ua) || uaPlatform === 'macos') return 'macOS';
  if (/linux|x11|cros/.test(ua) || uaPlatform === 'linux') return 'Linux';

  return 'Другое';
}
