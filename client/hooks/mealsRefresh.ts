import { useState, useEffect } from 'react';

let globalMealsRefreshTrigger = 0;
let listeners: ((value: number) => void)[] = [];

export const triggerMealsRefresh = () => {
  globalMealsRefreshTrigger += 1;
  listeners.forEach(callback => callback(globalMealsRefreshTrigger));
};

export const useMealsRefresh = () => {
  const [trigger, setTrigger] = useState(globalMealsRefreshTrigger);

  useEffect(() => {
    const callback = (newValue: number) => setTrigger(newValue);
    listeners.push(callback);
    
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }, []);

  return trigger;
};

