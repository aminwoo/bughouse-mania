import Image from 'next/image'


interface Pocket {
    p: number;
    n: number;
    b: number;
    r: number;
    q: number;
}

interface PocketProps {
    color: "w" | "b"; 
}

export const Pocket: React.FC<PocketProps> = ({ color }) => {
    const pieces: Pocket = {p: 0, n: 1, b: 1, r: 0, q: 1}; 

    const handleDrag = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        console.log("drag");
    };

    return (
        <div className="pocket-container flex">
            {['q', 'r', 'b', 'n', 'p'].map(piece => (<Image className={`${color}${piece} ${pieces[piece as keyof Pocket] > 0 ? "opacity-100" : "opacity-50"}`} key={`${color}${piece}`} onMouseDown={handleDrag} src={`/images/${color}${piece}.png`} width={75} height={75} alt={`${piece}`} priority></Image>))}
        </div>
    );
};  