"use effect";

import React, { useRef, useEffect, useState } from "react";
import { Chessground } from "chessground";
import { Config } from "chessground/config";
import "./theme.css";

interface Props {
    config: Config;
}
 
const BoardComponent: React.FC<Props> = ({ config }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            const cg = Chessground(ref.current, config); 
            return () => cg.destroy(); 
        }
    }, [config]);

    return (
        <div>
            <div ref={ref} style={{ width: "397px", height: "397px" }}></div>
        </div>
    );
}

export default BoardComponent;