import { GameController } from './game-controller';

export class InteractiveGame extends GameController {
    constructor() {
        super();
        this.inputBox.setLabel(' Enter Move (SAN) or type "help" ');
    }

    protected override handleCommand(cmd: string): void {
        // Try to apply as a move
        if (this.applyMove(cmd)) {
            this.log(`Move: ${cmd}`);
            const nextPlayer = this.gameState.participants[this.gameState.turn] === 1 ? "White" : "Black";
            this.log(`${nextPlayer} to move.`);
            this.renderBoard();
        }
    }

    protected override showHelp(): void {
        this.log('{cyan-fg}Enter moves in SAN. Commands: undo, restart, help, exit{/}');
    }

    public run(): void {
        this.log("White to move.");
    }
}

// Allow direct execution
if (import.meta.main) {
    const game = new InteractiveGame();
    game.start();
}
