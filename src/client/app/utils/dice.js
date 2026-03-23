/**
 * Evaluates a dice expression string.
 * Supports: NdM notation, +, -, *, /, parentheses, integers and decimals.
 * Examples: "3d6", "2d8 + 5", "(3d6 + 4d5 * 2 + 12 - 1d4) * 2 / 4"
 *
 * Returns { total: number, rolls: [{ notation, values, subtotal }] }
 */
export function evalDiceString(expr) {
  const rolls = [];

  // Replace all NdM with rolled values, collect roll info
  const arithmetic = expr.replace(/(\d*)d(\d+)/gi, (match, n, s) => {
    const count = n ? parseInt(n, 10) : 1;
    const sides = parseInt(s, 10);
    const values = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const subtotal = values.reduce((a, b) => a + b, 0);
    rolls.push({ notation: match, values, subtotal });
    return subtotal;
  });

  const total = _evalArith(arithmetic);
  return { total, rolls };
}

// ── Tokenizer ──────────────────────────────────────────────────────────────

function _tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if (/[\d.]/.test(expr[i])) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: "num", value: parseFloat(num) });
    } else if ("+-*/()".includes(expr[i])) {
      tokens.push({ type: "op", value: expr[i++] });
    } else {
      throw new Error(`Unexpected character: "${expr[i]}"`);
    }
  }
  return tokens;
}

// ── Recursive descent parser (expr → term → factor) ───────────────────────

function _evalArith(expr) {
  const tokens = _tokenize(expr);
  let pos = 0;

  const peek = () => tokens[pos] ?? null;
  const consume = () => tokens[pos++];
  const match = (val) => peek()?.value === val ? (pos++, true) : false;

  function parseExpr() {
    let left = parseTerm();
    while (peek()?.value === "+" || peek()?.value === "-") {
      const op = consume().value;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (peek()?.value === "*" || peek()?.value === "/") {
      const op = consume().value;
      const right = parseFactor();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseFactor() {
    if (match("-")) return -parseFactor();
    if (match("+")) return parseFactor();
    if (match("(")) {
      const val = parseExpr();
      if (!match(")")) throw new Error("Expected closing parenthesis");
      return val;
    }
    const tok = consume();
    if (tok?.type === "num") return tok.value;
    throw new Error(`Unexpected token: "${tok?.value}"`);
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error(`Unexpected token: "${tokens[pos].value}"`);
  return result;
}
