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

export interface SourcePosition { line: number; column: number; end_column: number }
export interface ParseTree {
  symbol: string; children: ParseTree[];
  lexeme?: string; token_type?: Token['type'];
  line?: number; column?: number; end_column?: number;
}
export type Expression =
  | ({ type: 'Constant'; value: number } & SourcePosition)
  | ({ type: 'Binary'; op: '+' | '*'; left: Expression; right: Expression } & SourcePosition);
export interface Delivery extends SourcePosition {
  type: 'Delivery'; kind: 'run' | 'wide' | 'noball' | 'wicket' | 'bye' | 'legbye'; value: Expression;
}
export interface Over extends SourcePosition { type: 'Over'; number: number; partial: boolean; deliveries: Delivery[] }
export interface InningsNode extends SourcePosition { type: 'Innings'; team: string; complete: boolean; overs: Over[] }
export interface TeamNode extends SourcePosition { type: 'Team'; id: string; name: string; name_location: SourcePosition }
export interface Program { type: 'Program'; teams: TeamNode[]; innings: InningsNode[] }
export interface SyntaxOutput { ast: Program; parse_tree: ParseTree }

export interface TeamSymbol extends SourcePosition { kind: 'team'; name: string }
export interface DeliveryCheck extends SourcePosition {
  team: string; over: number; delivery: number; kind: Delivery['kind']; value: number; status: 'valid'; legal: boolean;
}
export interface SemanticOutput {
  symbol_table: Record<string, TeamSymbol>; checks: DeliveryCheck[]; validated_ast: Program;
  over_checks: OverCheck[]; innings_checks: InningsCheck[];
}

export type Operand = number | string;
export type Instruction =
  | { op: 'INNINGS'; team: string; complete: boolean }
  | { op: 'OVER'; number: number; partial: boolean }
  | { op: 'ADD' | 'MUL'; target: string; left: Operand; right: Operand }
  | ({ op: 'DELIVERY'; kind: Delivery['kind']; value: Operand } & SourcePosition)
  | { op: 'END_INNINGS' };
export interface IntermediateOutput { instructions: Instruction[]; code: string }
export interface TargetOutput { code: string; scorecard: ScoreData }

export interface OptimizationOutput {
  before: string; after: string; changes: string[];
  before_count: number; after_count: number; instructions: Instruction[];
}

export interface OverCheck extends SourcePosition {
  team: string; over: number; partial: boolean; legal_balls: number; deliveries: number;
  wickets_so_far: number; status: 'valid';
}
export interface InningsCheck extends SourcePosition {
  team: string; runs: number; wickets: number; legal_balls: number; target: number | null;
  complete: boolean; completion_reason: 'target_reached' | 'all_out' | 'marked_complete' | null;
  status: 'valid';
}

export type ParseTreeNode = ParseTree;
