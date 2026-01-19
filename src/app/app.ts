import * as blessed from 'blessed';

import { ChessBoard } from '../chess-board';
import { ChessEngine, type ChessGameState } from '../chess-engine';
import { PieceType } from '../piece-type.enums';

// --- Visual Configuration ---
const PIECE_SYMBOLS: Record<number, string> = {
    [PieceType.None]: ' ',
    [PieceType.EmptySquare]: ' ',
    [PieceType.Pawn]: '♟',
    [PieceType.Knight]: '♞',
    [PieceType.Bishop]: '♝',
    [PieceType.Rook]: '♜',
    [PieceType.Queen]: '♛',
    [PieceType.King]: '♚',
};

export abstract class ChessTui {
    protected screen: blessed.Widgets.Screen;
    protected boardBox: blessed.Widgets.BoxElement;
    protected logBox: blessed.Widgets.Log;
    protected inputBox: blessed.Widgets.TextboxElement;
    protected gameState: ChessGameState;

    constructor() {
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'TypeScript Chess Engine'
        });

        // Layout: Board on the Left
        this.boardBox = blessed.box({
            top: '0',
            left: '0',
            width: '70%',
            height: '100%-3',
            label: ' Board ',
            tags: true,
            border: { type: 'line' },
            style: { border: { fg: 'green' } }
        });

        // Layout: Log on the Right
        this.logBox = blessed.log({
            top: '0',
            left: '70%',
            width: '30%',
            height: '100%-3',
            label: ' Game History ',
            border: { type: 'line' },
            style: { border: { fg: 'yellow' } },
            scrollable: true,
            scrollbar: { ch: '<' }
        });

        // Layout: Input at the Bottom
        this.inputBox = blessed.textbox({
            bottom: '0',
            left: '0',
            width: '100%',
            height: 3,
            label: ' Enter Move (Chess Notation or "exit" to quit) ',
            keys: true,
            inputOnFocus: true,
            border: { type: 'line' },
            style: { border: { fg: 'cyan' }, focus: { border: { fg: 'white' } } }
        });

        this.screen.append(this.boardBox);
        this.screen.append(this.logBox);
        this.screen.append(this.inputBox);

        // Quit on Escape or C-c
        this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

        this.inputBox.on('submit', (value) => {
            const cmd = value.trim();
            this.inputBox.clearValue();
            this.inputBox.focus(); // Keep focus
            if (cmd) {
                if (cmd.toLowerCase() === 'exit') {
                    process.exit(0);
                }
                this.onCommand(cmd);
            }
            this.screen.render();
        });

        this.gameState = this.createStandardGame();
    }

    protected createStandardGame(): ChessGameState {
        const board = new ChessBoard({ width: 8, height: 8 });
        const setupRow = (y: number, owner: number, pieces: PieceType[]) => {
            pieces.forEach((p, x) => board.setTile(x, y, p, owner));
        };
        const backRank = [
            PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen,
            PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook
        ];
        const pawnRank = Array(8).fill(PieceType.Pawn);

        setupRow(0, 2, backRank); // Black
        setupRow(1, 2, pawnRank);
        setupRow(6, 1, pawnRank); // White
        setupRow(7, 1, backRank); // White

        return ChessEngine.newGame(board, [
            { team_identifier: 1, player_identifiers: [1] },
            { team_identifier: 2, player_identifiers: [2] }
        ]);
    }

    public renderBoard() {
        let content = '';
        const boardWidth = this.gameState.board.getWidth();
        const boardHeight = this.gameState.board.getHeight();

        // Iterate rows
        for (let y = 0; y < boardHeight; y++) {
            let rowTop = '   ';
            let rowMid = ` ${boardHeight - y} `;
            let rowBot = '   ';

            for (let x = 0; x < boardWidth; x++) {
                const tile = this.gameState.board.getTile(x, y);

                // Skip void/impassable tiles (out of bounds or special types)
                if (this.gameState.board.isOutOfBounds(x, y)) {
                    rowTop += '       ';
                    rowMid += '       ';
                    rowBot += '       ';
                    continue;
                }

                const isWhiteSquare = (x + y) % 2 === 0;
                const bg = isWhiteSquare ? '{#aaaaaa-bg}' : '{#555555-bg}';

                let fg = '{black-fg}';
                if (tile.owner_identifier === 1) fg = '{blue-fg}';
                else if (tile.owner_identifier === 2) fg = '{red-fg}';

                const symbol = PIECE_SYMBOLS[tile.piece] || ' ';

                rowTop += `${bg}       {/}`;
                rowMid += `${bg}${fg}   {bold}${symbol}{/bold}   {/}`;
                rowBot += `${bg}       {/}`;
            }
            content += rowTop + '\n';
            content += rowMid + '\n';
            content += rowBot + '\n';
        }

        content += '\n';
        // Generate file labels dynamically
        const fileLabels = 'abcdefghijklmnopqrstuvwxyz'.slice(0, boardWidth);
        let headerStr = '   ';
        for (const f of fileLabels) {
            headerStr += `   ${f}   `;
        }
        content += headerStr;

        this.boardBox.setContent(content);
        this.screen.render();
    }

    public log(msg: string) {
        this.logBox.log(msg);
        this.screen.render();
    }

    public setGameState(state: ChessGameState) {
        this.gameState = state;
    }

    protected abstract onCommand(cmd: string): void;

    public abstract run(): void;

    public start() {
        this.renderBoard();
        this.log("Game Started.");
        this.run();
        this.inputBox.focus();
        this.screen.render();
    }
}