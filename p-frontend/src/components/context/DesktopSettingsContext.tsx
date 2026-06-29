import React, { createContext, useContext, useState } from "react";

export type DesktopSettingsState = Record<string, boolean>;

const DEFAULT_SETTINGS: DesktopSettingsState = {};
const STORAGE_KEY = "desktop-settings";

interface DesktopSettingsContextValue {
  settings: DesktopSettingsState;
  localSettings: DesktopSettingsState;
  setLocalSetting: (key: string, value: boolean) => void;
  saveSettings: () => void;
  resetLocalSettings: () => void;
  resetAllSettings: () => void;
}

const DesktopSettingsContext = createContext<DesktopSettingsContextValue | null>(null);

export const DesktopSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DesktopSettingsState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [localSettings, setLocalSettings] = useState<DesktopSettingsState>({ ...settings });

  const setLocalSetting = (key: string, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = () => {
    setSettings(localSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localSettings));
  };

  const resetLocalSettings = () => {
    setLocalSettings({ ...DEFAULT_SETTINGS });
  };

  const resetAllSettings = () => {
    setLocalSettings({ ...DEFAULT_SETTINGS });
    setSettings({ ...DEFAULT_SETTINGS });
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <DesktopSettingsContext.Provider
      value={{
        settings,
        localSettings,
        setLocalSetting,
        saveSettings,
        resetLocalSettings,
        resetAllSettings,
      }}
    >
      {children}
    </DesktopSettingsContext.Provider>
  );
};

export const useDesktopSettings = () => {
  const ctx = useContext(DesktopSettingsContext);
  if (!ctx) throw new Error("useDesktopSettings must be used inside DesktopSettingsProvider");
  return ctx;
};
