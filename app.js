// Import necessary modules
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser"; // Import bodyParser using ES6 import syntax
import mongoose from "mongoose";
import _ from "lodash";


// Create an Express application
const app = express();

// Set the view engine to EJS (Embedded JavaScript)
app.set('view engine', 'ejs');

// Middleware to parse request bodies and serve static files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Middleware to handle CSS files under "/public/css" route
app.use("/public/css", (req, res, next) => {
    res.setHeader("Content-Type", "text/css");
    next();
});



mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

// Define a schema for to-do items
const itemsSchema = {
    name: String
};

// Create a model for to-do items
const Item = mongoose.model("Item", itemsSchema);

// Create default to-do items
const item1 = new Item({
    name: "Welcome to your todolist!"
});

const item2 = new Item({
    name: "Tap + button to add an item."
});

const item3 = new Item({
    name: "Click checkbox to delete item."
});

const defaultItems = [item1, item2, item3];

// Define a schema for lists that contain to-do items
const listSchema = {
    name: String,
    items: [itemsSchema]
};

// Create a model for lists
const List = mongoose.model("List", listSchema);

// Define the route for the root path ("/")
app.get("/", async function (req, res) {
    try {
        // Find all to-do items in the database
        const foundItems = await Item.find({});

        if (foundItems.length === 0) {
            // Insert default items if the database is empty
            await Item.insertMany(defaultItems);
        }

        // Render or redirect to a view here (e.g., "list")
        res.render("list.ejs", { listTitle: "Today", newListItems: foundItems });
    } catch (err) {
        console.log(err);
        // Handle errors here (e.g., render an error page)
        res.status(500).send("Internal Server Error"); // Example error response
    }
});

// Define a dynamic route for custom lists (e.g., "/Work")
app.get("/:customListName", async function (req, res) {
    const customListName = _.capitalize(req.params.customListName);

    // Handle "/about" route separately
    if (customListName === "About") {
        res.render("about.ejs");
        return; // Exit the function to prevent further execution
    }

    try {
        // Find a list with the specified name in the database
        const foundList = await List.findOne({ name: customListName });

        if (!foundList) {
            // Create a new list if it doesn't exist
            const list = new List({
                name: customListName,
                items: defaultItems
            });
            await list.save();
            res.redirect("/" + customListName);
        } else {
            // Show an existing list
            res.render("list.ejs", { listTitle: foundList.name, newListItems: foundList.items });
        }
    } catch (err) {
        console.log(err);
    }
});

// Handle POST requests to add new to-do items
app.post("/", async function (req, res) {
    const itemName = req.body.newItem;
    const listName = req.body.list;

    const item = new Item({
        name: itemName
    });

    if (listName === "Today") {
        await item.save();
        res.redirect("/");
    } else {
        try {
            const foundList = await List.findOne({ name: listName });
            foundList.items.push(item);
            await foundList.save();
            res.redirect("/" + listName);
        } catch (err) {
            console.log(err);
        }
    }
});

// Handle POST requests to delete to-do items
app.post("/delete", async function (req, res) {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === "Today") {
        try {
            // Delete a to-do item by its ID
            await Item.findByIdAndRemove(checkedItemId);
            res.redirect("/");
        } catch (err) {
            console.log(err);
        }
    } else {
        try {
            // Remove an item from a custom list by its ID
            await List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } });
            res.redirect("/" + listName);
        } catch (err) {
            console.log(err);
        }
    }
});

// Define a route for the "About" page
app.get("/about", function (req, res) {
    res.render("about.ejs");
});

// Set the server port, either using an environment variable or default to 3000
let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

// Start the server
app.listen(port, function () {
});
