/* --------
 Lexer.js

 Lexer functions.
 -------- */

function lex()
{
    var currentLine = 1;
    // Keep track if the user is in quotes because then spaces become important
    var lexingString = false;
    // Grab the "raw" source code.
    var sourceCode = document.getElementById("taSourceCode").value;
    sourceCode = trim(sourceCode);

    putMessage("Lexing has started.");

    // Go through the source code then try to match the source code with a regular expression token
    for (var i in sourceCode) {
        // Find the next token and then put the type and the regular expression in their variables
        var found = findNextToken(sourceCode);
        var type = found[0];
        var regex = found[1];
        // Get the string matched and other things from the matched token. I like exec
        var stringInformation = regex.exec(sourceCode);

        // If it is not null find the right token add a token depending on the type and keep its value
        if (type != null)
        {
            // If quotes are encountered, single or double, start or end the lexing of a string
            if (type === "T_QUOTES")
            {
                lexingString = !lexingString;
                addToken(type, -1, currentLine);
            }
            // If new line is encountered increase the line count
            else if (type === "T_NEWLINE")
            {
                currentLine++;
            }
            // Ignore spaces and tabs unless it is in a string then they are important
            else if (type === "T_SPACE" || type === "T_TAB")
            {
                if (lexingString && type === "T_SPACE")
                {
                    addToken(type, stringInformation[0], currentLine);
                }
            }
            // If a token is not known
            else if (type === null)
            {
                putMessage("Unknown token: " + stringInformation[0] + " on line: " + currentLine);
            }
            // For anything not mentioned above it will add a token because they do not have special things and it makes
            // them sad
            else
            {
                addToken(type, stringInformation[0], currentLine);
            }
            // This put message is just for testing purposes
            putMessage("Token: " + type + " with value: " + stringInformation[0] + " on line: " + currentLine);
            // Get the rest of the source code that was not matched
            sourceCode = sourceCode.substring(stringInformation[0].length, sourceCode.length);
        }
        else
        {
            putMessage("No token found.");
        }
    }
}
