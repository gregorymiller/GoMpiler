/* --------
    Tree.js

    Structure for building the different trees needed
 -------- */


var Tree = function() {
    this.root = null;
    this.current = null;

    this.addNode = function(id) {
        var node = new Node(id);

        if (this.root === null)
        {
            this.root = node;
            this.current = node;
        }
        else
        {
            node.parent = this.current;
            this.current.children.push(node);
            this.current = node;
        }
    };

    this.atLeaf = function() {
        if (this.current.parent !== null)
        {
            this.current = this.current.parent;
        }
        else
        {
            _ErrorCount++;
            putMessage("Error: Problem with tree traversal.");
        }
    };

    this.toString = function() {
        var treeString = "";

        function traverse(node, depth) {
            for (var i = 0; i <= depth; i++) {
                treeString += i;
            }

            if (node.children === null)
            {
                treeString += "<" + node.value + ">\n";
            }
            else
            {
                treeString += "<" + node.value + ">\n";
                for (var j in node.children) {
                    traverse(node.children[j], depth+1);
                }
            }
        }

        traverse(this.root, 0);

        return treeString;
    };
};

var Node = function(node) {
    this.value = node;
    this.children = new Array();
    this.parent = null;
};