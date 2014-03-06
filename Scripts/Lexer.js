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
        if (sourceCode.charAt(x) === EOF)
            endOfFileMarker = true;
    }

    // If there is no end of file add one and warn the user
    if(!endOfFileMarker)
    {
        putMessage("Warning: No end of file. End of file is being added to continue.");
        sourceCode += EOF;
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

    // If no errors exist than parse otherwise stop
    if (_ErrorCount < 1)
    {
        putMessage("Lex complete.");
        parseProgram();
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
        var found = lexFindNextToken(sourceCode, lexingString);
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
                if(lexingString)
                    addToken("T_ENDQUOTES", stringInformation[0], currentLine);
                else
                    addToken(type, stringInformation[0], currentLine);


                lexingString = !lexingString;

                verbosePutMessage("Token: " + type + " on line: " + currentLine);
            }
            // If new line is encountered increase the line count
            else if (type === "T_NEWLINE")
            {
                // If you encounter a string value trying to span multiple lines return and log an error
                if (lexingString)
                {
                    putMessage("Error: String value is trying to span multiple lines.") ;
                    _ErrorCount++;
                    return;
                }

                currentLine++;
            }
            // Ignore spaces unless it is in a string then they are important
            else if (type === "T_SPACE")
            {
                if (lexingString)
                {
                    addToken(type, stringInformation[0], currentLine);
                    verbosePutMessage("Token: " + type + " on line: " + currentLine);
                }
            }
            // Return as soon as the end of file is read
            else if (type === "T_ENDOFFILE")
            {
                addToken(type, stringInformation[0], currentLine);
                verbosePutMessage("Token: " + type + " on line: " + currentLine + " with value: " + stringInformation[0]);
                return;
            }
            // For anything not mentioned above it will add a token because they do not have special things and it makes
            // them sad
            else if (!lexingString && type === "T_CHAR")
            {
                addToken("T_ID", stringInformation[0], currentLine);
                verbosePutMessage("Token: T_ID on line: " + currentLine + " with value: " + stringInformation[0]);

            }
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
