import { useState, useEffect } from 'react';

let globalRefreshTrigger = 0;
let listeners: ((value: number) => void)[] = [];

export const triggerDailyRefresh = () => {
  globalRefreshTrigger += 1;
  listeners.forEach(callback => callback(globalRefreshTrigger));
};

export const useDailyRefresh = () => {
  const [trigger, setTrigger] = useState(globalRefreshTrigger);

  useEffect(() => {
    const callback = (newValue: number) => setTrigger(newValue);
    listeners.push(callback);
    
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }, []);

  return trigger;
};