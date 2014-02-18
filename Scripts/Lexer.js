/* --------
 Lexer.js

 Lexer functions.
 -------- */

function lex()
{
    // Keep track if the end of file was found or things after it
    var endOfFileMarker = false;
    var stuffAfterEndOfFile = false;
    // Grab the "raw" source code.
    var sourceCode = document.getElementById("taSourceCode").value;
    sourceCode = trim(sourceCode);

    // Search for the end of file marker if the loop continues to run that means there are characters after it
    for (var x = 0; x < sourceCode.length; x++) {
        if (endOfFileMarker)
            stuffAfterEndOfFile = true;
        if (sourceCode.charAt(x) === "$")
            endOfFileMarker = true;
    }

    // If there is no end of file add one and warn the user
    if(!endOfFileMarker)
    {
        putMessage("Error: No end of file located.");
        putMessage("Warning: End of file is being added to continue.");
        sourceCode += "$";
    }
    // If an end of file located and there are things after show a warning
    else if (endOfFileMarker && stuffAfterEndOfFile)
    {
        putMessage("End of file located.");
        putMessage("Warning: Data was detected after the end of file marker it will be ignored.");
    }
    // Show an end of file
    else
    {
        putMessage("End of file located.")
    }

    putMessage("Lexing has started.");

    findAndAddTokens(sourceCode);

    for (var i in _Tokens) {
        putMessage("Lex returned [" + _Tokens[i].toString() + "]");
    }

    // If no errors exist than parse otherwise stop
    if (_ErrorCount < 1)
    {
        // Parse
    }
    else
    {
        putMessage("Please address the errors and recompile.");
    }
}

function findAndAddTokens(sourceCode)
{
    var currentLine = 1;
    // Keep track if the user is in quotes because then spaces become important
    var lexingString = false;

    // Go through the source code then try to match the source code with a regular expression token
    for (var i in sourceCode) {
        // Find the next token and then put the type and the regular expression in their variables
        var found = findNextToken(sourceCode);
        var type = found[0];
        var regex = found[1];

        // If it is not null find the right token add a token depending on the type and keep its value
        if (type != null)
        {
            // Get the string matched and other things from the matched token. I like exec
            var stringInformation = regex.exec(sourceCode);

            // If quotes are encountered, single or double, start or end the lexing of a string
            if (type === "T_QUOTES")
            {
                lexingString = !lexingString;
                addToken(type, -1, currentLine);

                verbosePutMessage("Token: " + type + " on line: " + currentLine);
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
                    verbosePutMessage("Token: " + type + " on line: " + currentLine);
                }
            }
            // Return as soon as the end of file is read
            else if (type === "T_ENDOFFILE")
            {
                return;
            }
            // For anything not mentioned above it will add a token because they do not have special things and it makes
            // them sad
            else
            {
                addToken(type, stringInformation[0], currentLine);
                verbosePutMessage("Token: " + type + " on line: " + currentLine + " with value: " + stringInformation[0]);
            }

            // Get the rest of the source code that was not matched
            sourceCode = sourceCode.substring(stringInformation[0].length, sourceCode.length);
        }
        // If a token is not known report an error, try deleting a character to continue to parse, and increase the
        // error count
        else if (type === null)
        {
            putMessage("Error: Unknown token: " + sourceCode.charAt(0) + " on line: " + currentLine);
            sourceCode = sourceCode.substring(1, sourceCode.length);
            _ErrorCount++;
        }
    }
}
