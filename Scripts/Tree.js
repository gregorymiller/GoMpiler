/* --------
    Tree.js

    Structure for building the different trees needed
 -------- */


var Tree = function() {
    this.root = null;
    this.current = null;

    this.addNode = function(id, leafOrBranch) {
        var node = new Node(id);

        // If the root is null at the node at the root otherwise make a child node
        if (this.root === null)
        {
            this.root = node;
            this.current = node;
        }
        else
        {
            node.parent = this.current;
            this.current.children.push(node);
        }

        // If it is a branch move to the node otherwise just stay at the current node
        if (leafOrBranch === "branch")
        {
            this.current = node;
        }
    };

    // If a tree is at a leaf move it back up to its parent
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
            // Make an offset based on the depth
            for (var i = 0; i < depth; i++) {
                treeString += " ";
            }

            // If it is a leaf print out the value and the depth
            if (node.children === null)
            {
                treeString += "<" + node.value + "> depth: " + depth + "\n";
            }
            // If it is not a leaf print out the value the continue to each of its children
            else
            {
                treeString += "<" + node.value + "> depth: " + depth + "\n";
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