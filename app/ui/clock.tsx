import { useEffect } from "react";

interface Props {
    timeLeft: number,
    running: boolean,
    updateTime: (newTime: number) => void, 
}

export const Clock: React.FC<Props> = ({ timeLeft, running, updateTime }) => {

    function formatTime(time: number) {
        const minutes = Math.floor(time / 600); 
        const seconds = Math.floor((time - minutes * 600) / 10); 
        const deciseconds =  (time - minutes * 600 - seconds * 10); 
        return `${minutes}:${seconds.toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false
          })}.${deciseconds}`; 
    }

    useEffect(() => {
        const interval = setInterval(() => { 
            if (running && timeLeft > 0) {
                updateTime(timeLeft - 1); 
            }
        }, 100);
        return () => clearInterval(interval); 
    }, [timeLeft, running, updateTime]);

    const boxStyle = "flex rounded-sm mt-3 mb-4 min-h-16 min-w-36 max-w-36 items-center justify-center shadow-md" + (running ? (timeLeft < 200 ? " bg-red-300" : " bg-green-300" ) : ""); 
    const textStyle = "font-bold text-4xl font-sans select-none " + (running ? "text-black" : "text-black"); 

    return (
        <div className={boxStyle}>
            <text className={textStyle}>
                {formatTime(timeLeft)} 
            </text>
        </div>
    );
};