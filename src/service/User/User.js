const mongo = require('../../config/mongo');
const AlphebetizedModels = mongo.AlphabetizedModels;
const colors = require('colors');
const WikiEditor = require('../Wiki/WikiEditor');
class User {
    constructor(username) {
        this.username = username
        this.reviews = [];
        this.reviewCount = 0;
    }
    addReview(rating, type, comments, permalink) {
        const review = new Review(rating, type, comments, permalink);
        this.reviewCount++;
        this.reviews.push(review);
    }
}

class Review {
    constructor(rating, type, comments, permalink) {
        this.rating = rating
        this.type = type
        this.comments = comments
        this.permalink = permalink
    }
}


// [Update User Function] -- called from bot commands
async function update(command, permalink) {
    console.log("User Service processing update user request...".yellow);
    console.log("Updating user: ".yellow, command.args[0]);
    // First strip any /u/ from the beginning of the username
    command.args[0] = stripSlashes(command.args[0]);
    // First check if user exists within the database...
    const foundUser = await checkExistingUser(command.args[0]);

    if (foundUser === null) {
        // If user does not exist, create a new one...
        console.log("No user found. Storing new data...".red);
        await storeNewUserData(command, permalink);
    } else {
        console.log("Found user within the database. Updating... ".green);
        // If user does exist, simply add a new Review and save
        await updateUser(foundUser, command, permalink);
    }
    console.log("Processing user data complete!".green)



    // Once the user is persisted, find its wiki-category
    let model = getAlphabetizedModel(command.args[0]);
    // Once category is determined, ask WikiEditor to edit the page.
    await WikiEditor.editWikiPage(`userdirectory/${model.category.toLowerCase()}`);

}

// Check for an existing user in the database by username
// Returns the user(document) if found
async function checkExistingUser(username) {
    console.log("Checking for an existing user by username: ".yellow, username);
    // Find the model for the first letter of the username
    let model = getAlphabetizedModel(username);
    const foundUser = await model.model.findOne({
        username: username
    });
    return foundUser;
}

// Store a new user in the database with a single review.
async function storeNewUserData(command, permalink) {
    console.log("Building new user from command: ".magenta, command);
    const NewUser = new User(command.args[0]);
    let username = command.args[0];
    let ratingNumber = command.args[1];
    let interactionType = command.args[3];
    if (interactionType == null) {
        interactionType = "sale";
    }
    // If comments are present within the arguments, build them into a string.
    let comments = "No comment."
    if (command.args.length > 3) {
        comments = buildCommentString(command.args.slice(4, command.args.length));
    }

    // Add the built review to the model and persist it to the database
    NewUser.addReview(ratingNumber, interactionType, comments, permalink);
    let model = getAlphabetizedModel(username);
    const instance = new model.model({
        username: username,
        reviews: NewUser.reviews,
        reviewCount: NewUser.reviewCount
    });
    console.log("persisting new user to mongo...".bgBlue.white);
    await instance.save();
}

// Update an existing user already found within the database
async function updateUser(user, command, permalink) {
    console.log("Updating existing user: ".yellow, command.args[0]);
    let ratingNumber = command.args[1];
    let interactionType = command.args[3];
    if (interactionType == null) {
        interactionType = "sale";
    }
    // Build the comment string from args greater than 3
    let comments = "No comment."
    if (command.args.length > 3) {
        comments = buildCommentString(command.args.slice(4, command.args.length));
    }

    let review = new Review(parseInt(ratingNumber), interactionType, comments, permalink);
    user.reviews.push(review);
    user.reviewCount++;
    console.log("persisting user to mongo...".yellow);
    await user.save();
}

// Helper Functions

// Strip Slashes from username (removes '/u/' or 'u/' if existing)
const stripSlashes = function (username) {
    // Strip the u/ if exists
    if (username.startsWith("u/")) {
        username = username.replace("u/", "").trim();
    } else if (username.startsWith("/u/")) {
        username = username.replace("/u/", "").trim();
    }
    return username;
}

// Takes in the array of comments split from 3, to length,
// Returns them as a string joined by empty spaces.
const buildCommentString = function (arr) {
    return arr.join(" ");
}

// Takes in a username and returns the model for that alphabatized section
const getAlphabetizedModel = function (username) {
    const firstLetter = username[0].toLowerCase();
    let model = mongo.AlphabetizedModels.find(model => model.category === firstLetter);
    // If username starts with - or _, set model as "etc"
    model == undefined ? model = mongo.AlphabetizedModels.find(model => model.category === "etc") : false;
    return model;
}


// Early Tests
async function runTest() {

    // const TestUser = new User("AUser");
    // TestUser.addReview(5, "trade", "https://www.discord.com");

    // console.log("creating a new instance of :", mongo.AlphabetizedModels[0].model);
    // const instance = new mongo.AlphabetizedModels[0].model({
    //     username: TestUser.username,
    //     reviews: TestUser.reviews,
    //     reviewCount: TestUser.reviewCount
    // });
    // console.log("saving this instance:", instance)

    // await instance.save();


    // mongo.AlphabetizedModels[0].model.find({}, function (err, user) {
    //     console.log("Found this user: ", user)
    // });
    // mongo.AlphabetizedModels[1].model.find({}, function (err, user) {
    //     console.log("Found this user: ", user)
    // });

    // console.log("Finding user Auser...")
    // const user = await mongo.AlphabetizedModels[0].model.findOne({
    //     username: "AUser"
    // }).exec();
    // console.log("Found user: ", user)

    console.log("Running User.js Test...")
    const user = await mongo.findUsersByFirstLetter("A");
    console.log(user)
    anotherReview = new Review(1, "sale", "http://google.com");
    user[0].reviews.push(anotherReview);
    user[0].reviewCount++;
    user[0].save();
}
module.exports = {
    runTest,
    update
}