import { useState, useEffect } from 'react';

export function useDateTime() {
    const [dateTime, setDateTime] = useState(() => {
        const date = new Date();
        return {
            time: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
            date: '', // Will be populated by effect
            dateDiary: ''
        };
    });

    useEffect(() => {
        const updateDateTime = () => {
            const date = new Date();
            const dayList = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            const dayName = dayList[date.getDay()];
            const month = date.getMonth() + 1;
            const today = `${dayName} ${date.getDate()}/${month}`;

            const hour = date.getHours();
            const min = date.getMinutes().toString().padStart(2, '0');
            const time = `${hour}:${min}`;

            setDateTime(prev => {
                if (prev.time === time && prev.date === today) {
                    return prev;
                }
                return {
                    time,
                    date: today,
                    dateDiary: today
                };
            });
        };

        updateDateTime();
        // Update every minute since we only show hours and minutes
        const interval = setInterval(updateDateTime, 60000);

        return () => clearInterval(interval);
    }, []);

    return dateTime;
}
