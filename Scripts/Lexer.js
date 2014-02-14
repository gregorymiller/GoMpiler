/* --------
 Lexer.js

 Lexer functions.
 -------- */

function lex()
{
    var currentLine = 1;
    // Grab the "raw" source code.
    var sourceCode = document.getElementById("taSourceCode").value;
    sourceCode = trim(sourceCode);

    putMessage("Lexing has started.");

    // Go through the source code then try to match the source code with a regular expression token
    for (var i = 0; i < sourceCode.length; i++) {
        for (var key in regExTokens) {
            var tempRegEx = regExTokens[key].regex;
            var tempType = regExTokens[key].type;
        }

    }
}
