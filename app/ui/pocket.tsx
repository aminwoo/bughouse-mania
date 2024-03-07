import Image from 'next/image'
import { useEffect, useState } from 'react';
import { Api } from 'chessground/api';
import { Role } from 'chessground/types';

interface Pocket {
    pawn: number;
    knight: number;
    bishop: number;
    rook: number;
    queen: number;
}

interface PocketProps {
    color: "white" | "black"; 
    hand: string;
    small: boolean;
    cg?: Api | undefined;
}

interface PieceMapping {
    [key: string]: keyof Pocket;
}

export const Pocket: React.FC<PocketProps> = ({ color, hand, small, cg }) => {
    const [pieces, setPieces] = useState<Pocket>({pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0}); 

    const handleDrag = (event: React.MouseEvent<HTMLDivElement>, piece: string) => {
        event.preventDefault();
        if (pieces[piece as keyof Pocket] > 0) {
            if (cg) {
                cg.dragNewPiece({ color: color, role: piece as Role}, event.nativeEvent as unknown as MouseEvent); 

            }
        }
    };

    useEffect(() => {
        const newPieces: Pocket = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };
        const mapping: PieceMapping = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
    
        for (let piece of hand) {
            const pieceType = mapping[piece];
            if (pieceType) {
                newPieces[pieceType]++;
            }
        }
    
        setPieces(newPieces);
    }, [hand]);

    return (
        <div className={`pocket-container flex ${small ? "scale-75" : "scale-100"}`}>
            {['queen', 'rook', 'bishop', 'knight', 'pawn'].map(piece => (
            <div className="relative select-none" key={`${color}${piece}`} onMouseDown={(event) => handleDrag(event, piece)}>
                <Image className={`${color}${piece} ${pieces[piece as keyof Pocket] > 0 ? "opacity-100" : "opacity-50"}`} key={`${color}${piece}`} width={75} height={75} alt={`${piece}`} src={`/images/${color}_${piece}.png`} priority></Image>
                {pieces[piece as keyof Pocket] > 0 && <div className="flex items-align justify-center number-box absolute bottom-0 left-12 min-w-5 ring-4 ring-blue-600 outline outline-2 outline-blue-200 rounded-full bg-slate-50">
                    <text>
                        {pieces[piece as keyof Pocket]}
                    </text>
                </div>}
            </div>
            ))}
        </div>
    );
};  