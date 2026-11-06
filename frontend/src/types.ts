export const PHASE_NAMES = ['Lexical analysis', 'Syntax analysis', 'Semantic analysis', 'Intermediate code', 'Code optimization', 'Target code generation'];
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'unavailable';
export interface CompilerError { message: string; line: number; column: number; end_column?: number }
export interface PhaseEvent {
  phase: number; name: string; status: PhaseStatus; message?: string;
  output?: unknown; error?: CompilerError; duration_ms?: number;
}
export interface Health { status: string; api_version: number; phases: {phase: number; name: string; available: boolean}[] }
export interface Innings {
  team: string; name: string; runs: number; wickets: number; overs_display: string;
  complete: boolean; total_extras?: number;
}
export interface MatchResult { status: string; message: string; detail: string }
export interface ScoreData { innings: Innings[]; result: MatchResult }

export interface Token {
  type: 'KEYWORD' | 'IDENTIFIER' | 'STRING' | 'NUMBER' | 'SYMBOL' | 'EOF';
  lexeme: string; line: number; column: number; end_column?: number;
}
export interface LexicalOutput { tokens: Token[] }
