const { Chess } = require('chess.js');
const tcn = require('@savi2w/chess-tcn');
const { PAWN } = require("chess.js");
const { WHITE } = require("chess.js");

const SQUARE_CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?";
const DROP_CHARACTERS = {
    "=": "p",
    "-": "n",
    "+": "b",
    "*": "r",
    "&": "q",
}
const TOWARD_A_FILE = -1;
const STRAIGHT = 0;
const TOWARD_H_FILE = 1;
const PROMOTION_CHARACTERS = {
    "~": { to: "q", direction: STRAIGHT },
    "}": { to: "q", direction: TOWARD_H_FILE },
    "{": { to: "q", direction: TOWARD_A_FILE },
    "^": { to: "n", direction: STRAIGHT },
    ")": { to: "n", direction: TOWARD_H_FILE },
    "(": { to: "n", direction: TOWARD_A_FILE },
    "#": { to: "b", direction: STRAIGHT },
    "$": { to: "b", direction: TOWARD_H_FILE },
    "@": { to: "b", direction: TOWARD_A_FILE },
    "_": { to: "r", direction: STRAIGHT },
    "]": { to: "r", direction: TOWARD_H_FILE },
    "[": { to: "r", direction: TOWARD_A_FILE },
};

function squareCharacterToAlgebraicSquare(squareCharacter) {
    const index = SQUARE_CHARACTERS.indexOf(squareCharacter);
    const file = "abcdefgh".charAt(index % 8);
    const rank = Math.floor(index / 8) + 1;
    return `${file}${rank}`;
}

function encode(algebraicMove) {
    var move = null; 
    const from = algebraicMove.slice(0, 2);
    const to = algebraicMove.slice(2, 4);
    if (algebraicMove[1] == '@') {
        const to = algebraicMove.slice(2, 4);
        const piece = algebraicMove.charAt(0).toLowerCase();
        move = {"to": to, "drop": piece}; 
    }
    else  {
        move = {"to": to, "from": from}; 
        if (algebraicMove.length === 5 && algebraicMove[4] != '\n') 
            move["promotion"] = algebraicMove.charAt(4).toLowerCase();
    }

    return tcn.encode(move);
}

function decode(move) {
    var decoded = tcn.decode(move); 
    if (!decoded) {
        return ''; 
    }
    if ('drop' in decoded) {
        return decoded.drop + '@' + decoded.to; 
    }
    else if ('promotion' in decoded) {
        return decoded.from + decoded.to + decoded.promotion; 
    }
    return decoded.from + decoded.to; 
}

function applyMove(board, move) {
    const [firstChar, secondChar] = move;
    const isDrop = firstChar in DROP_CHARACTERS;
    const isPromotion = secondChar in PROMOTION_CHARACTERS;
    if (isDrop) {
        const to = squareCharacterToAlgebraicSquare(secondChar);
        const color = board.turn();
        board.put({ type: DROP_CHARACTERS[firstChar], color: color }, to);
        let [
        piecePlacement, sideToMove,
        castling, enPassantTarget, halfmoveClock, fullmoveNumber,] = board.fen().split(" ");
        sideToMove = sideToMove === "w" ? "b" : "w";
        enPassantTarget = "-";
        halfmoveClock = (parseInt(halfmoveClock) + 1).toString();
        if (sideToMove === "w") {
            fullmoveNumber = (parseInt(fullmoveNumber) + 1).toString();
        }
        const fenWithSideToMoveSwapped = [
            piecePlacement,
            sideToMove,
            castling,
            enPassantTarget,
            halfmoveClock,
            fullmoveNumber,
        ].join(" ");
        board.load(fenWithSideToMoveSwapped);
        return {color: color, to: to, lan: `${DROP_CHARACTERS[firstChar]}@${to}`};
    }
    else if (isPromotion) {
        const from = squareCharacterToAlgebraicSquare(firstChar);
        const fromFile = from.charAt(0);
        const fromRank = from.charAt(1);
        const { to: promotion, direction } = PROMOTION_CHARACTERS[secondChar];
        const toFile = "abcdefgh"["abcdefgh".indexOf(fromFile) + direction];
        const toRank = fromRank === "7" ? "8" : "1";
        return board.move({ from, to: `${toFile}${toRank}`, promotion });
    }
    else {
        const from = squareCharacterToAlgebraicSquare(firstChar);
        const to = squareCharacterToAlgebraicSquare(secondChar);
        return board.move(`${from}${to}`, {sloppy: true});
    }
}

function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)  
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }
    return chunks
}

const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

class Board {
    constructor() {
        this.board = [new Chess(), new Chess()];
        this.fen = [startingFen, startingFen]; 
        this.history = [[], []];
        this.times = [[1800, 1800], [1800, 1800]];
        this.movesCnt = [0, 0];
        this.whitehand = ''; 
        this.blackhand = ''; 
    }

    getTurn(board_num) {
        return this.board[board_num].turn() === 'w' ? 'white' : 'black'; 
    }       

    reset() {
        this.board = [new Chess(), new Chess()];
        this.fen = [startingFen, startingFen]; 
        this.history = [[], []];
        this.times = [[1800, 1800], [1800, 1800]];
        this.movesCnt = [0, 0];
        this.whitehand = ''; 
        this.blackhand = ''; 
    }

    play(move) {
        if (this.isLegal(move)) {
            this.movesCnt[0]++; 
            return applyMove(this.board[0], encode(move));
        }
        return null; 
    }

    lastMove(board_num) {
        return this.history[board_num].at(-1);
    }
    
    doMoves(moves, board_num) {
        const movesArray = chunkSubstr(moves, 2);
        for (let i = this.movesCnt[board_num]; i < movesArray.length; i++) {
            this.history[board_num].push(applyMove(this.board[board_num], movesArray[i]));
        }

        this.movesCnt[board_num] = Math.max(this.movesCnt[board_num], movesArray.length);
        const fen = this.board[board_num].fen();
        if (this.fen[board_num] === fen) {
            return null; 
        }
        this.fen[board_num] = fen;
        return fen;
    }

    setWhitehand(hand) {
        this.whitehand = hand; 
    }

    setBlackhand(hand) {
        this.blackhand = hand; 
    }

    isPredrop(move, userSide) { 
        if (move[1] === '@') {
            if (userSide) {
                if (this.whitehand.includes(move[0])) {
                    return false; 
                }
            }
            else if (this.blackhand.includes(move[0])) {
                return false; 
            }
            return true; 
        }
        return false; 
    }

    isLegal(move) { 
        if (move.length < 4) {
            return false; 
        }
        if (move[1] === '@') {
            if (this.board[0].turn() === 'w') {
                if (!this.whitehand.includes(move[0])) {
                    return false; 
                }
            }
            else if (!this.blackhand.includes(move[0])) {
                return false; 
            }
            const to = move.substring(2, 4); 
            if (this.board[0].get(to) !== false) {
                return false; 
            }

            this.board[0].put({ type: move[0], color: this.board[0].turn() }, to);
            const inCheck = this.board[0].inCheck();
            this.board[0].remove(to);
            return !inCheck; 
        }
        else {
            const from = move.substring(0, 2);
            const to = move.substring(2, 4); 
            const moves = this.board[0].moves({ square: from, verbose: true });
            for (const i in moves) {
                if (moves[i].to === to) {
                    return true; 
                }
            }
        }
        return false; 
    }
}

module.exports.Board = Board; 
module.exports.encode = encode; 
module.exports.decode = decode; 