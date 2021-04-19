const SHOULD_UNFOLLOW_MUTUALS = false;
const SHOULD_UNFOLLOW_PRIVATE = false;

let followingArray = new Array();


/** borrowed from https://github.com/qsniyg/maxurl **/
var cookies_str_to_list = function (cookiesstr) {
    var cookies = [];

    var splitted = cookiesstr.split(/;\s*/);
    array_foreach(splitted, function (kv) {
        var match = kv.match(/^\s*([^=\s]+)\s*=\s*(?:"([^"]+)"|([^"]\S*))\s*$/);

        cookies.push({ name: match[1], value: match[2] || match[3] });
    });

    return cookies;
}

var array_foreach = function (array, cb, do_shallow_copy) {
    if (do_shallow_copy) {
        var newarray = [];

        for (var i = 0; i < array.length; i++) {
            newarray.push(array[i]);
        }

        array = newarray;
    }

    for (var k = 0; k < array.length; k++) {
        if (cb(array[k], k) === false)
            return;
    }
};

var headers_list_to_dict = function (headers) {
    var dict = {};

    for (var i = 0; i < headers.length; i++) {
        dict[headers[i].name.toLowerCase()] = headers[i].value;
    }

    return dict;
};

/******************************** */

function sendRequest(method, endpoint, body, wantsResponse) {
    let myXHR = new XMLHttpRequest();
    myXHR.open(method, endpoint, false);
    method == 'post' && myXHR.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    myXHR.setRequestHeader("Authorization", "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA");
    myXHR.setRequestHeader("x-csrf-token", headers_list_to_dict(cookies_str_to_list(document.cookie)).ct0);
    myXHR.setRequestHeader('x-twitter-active-user', "yes");
    method == 'post' ? myXHR.send(body) : myXHR.send();
    if (wantsResponse) {
        return JSON.parse(myXHR.responseText);
    }

}

function doUnfollowUser(id) {
    sendRequest('post', 'https://twitter.com/i/api/1.1/friendships/destroy.json', 'user_id=' + id);
    console.log("Unfollowing user with id " + id)
}

function getIDbyScreenName(screenname) {
    let body = { "screen_name": screenname, "withHighlightedLabel": true };
    let req = sendRequest('get', 'https://twitter.com/i/api/graphql/hc-pka9A7gyS3xODIafnrQ/UserByScreenName?variables=' + encodeURIComponent(JSON.stringify(body)), null, true);
    return req.data.user.rest_id;
}

let pageNum = 1;
function getGraphQLListAndStoreInArray(username, listName, array, continuation) {
    var userId = getIDbyScreenName(username);
    if (continuation === undefined && pageNum == 1) {
        console.log("Getting first page");
        pageNum++;
        if (listName == "following") {
            let body = { "userId": userId, "count": 20, "withHighlightedLabel": false, "withTweetQuoteCount": false, "includePromotedContent": false, "withTweetResult": false, "withUserResults": false, "withNonLegacyCard": true };
            let resp = sendRequest('get', 'https://twitter.com/i/api/graphql/Yv1nkFWinEdXL2oemOSpZA/Following?variables=' + encodeURIComponent(JSON.stringify(body)), null, true);
            let entries = resp.data.user.following_timeline.timeline.instructions[2].entries;
            Object.entries(entries).forEach(
                (value) => {
                    if (value[1].entryId.includes("user")) {
                        array.push(value[1])
                    }
                }
            );
            let continuationToken = entries[entries.length - 2].content.value; // get token for paginating down
            console.log(continuationToken);
            getGraphQLListAndStoreInArray(username, listName, array, continuationToken)


        }

    } else {
        console.log("Fetching page " + pageNum);
        pageNum++;
        if (listName == "following") {
            let body = { "userId": userId, "count": 20, "cursor": continuation, "withHighlightedLabel": false, "withTweetQuoteCount": false, "includePromotedContent": false, "withTweetResult": false, "withUserResults": false, "withNonLegacyCard": true };
            let resp = sendRequest('get', 'https://twitter.com/i/api/graphql/Yv1nkFWinEdXL2oemOSpZA/Following?variables=' + encodeURIComponent(JSON.stringify(body)), null, true);
            let entries = resp.data.user.following_timeline.timeline.instructions[0].entries;
            Object.entries(entries).forEach(
                (value) => {
                    if (value[1].entryId.includes("user")) {
                        array.push(value[1])
                    }
                }
            );
            let continuationToken = entries[entries.length - 2].content.value; // get token for paginating down
            console.log(continuationToken);
            getGraphQLListAndStoreInArray(username, listName, array, continuationToken);
        }
    }
}


function unfollowall(followingList) {
    if (SHOULD_UNFOLLOW_MUTUALS || SHOULD_UNFOLLOW_PRIVATE) {
        followingList.forEach((obj) => {
            //console.log(obj.content.itemContent.user.legacy.screen_name);
            doUnfollowUser(obj.content.itemContent.user.rest_id);
            console.log("Unfollowed " + obj.content.itemContent.user.legacy.screen_name);

        })
    } else {
        followingList.forEach((obj) => {
            if (!obj.content.itemContent.user.legacy.protected && !obj.content.itemContent.user.legacy.followed_by) {
                //console.log(obj.content.itemContent.user.legacy.screen_name);
                doUnfollowUser(obj.content.itemContent.user.rest_id);
                console.log("Unfollowed " + obj.content.itemContent.user.legacy.screen_name);
            }
        })
    }
}

// usage:
// getGraphQLListAndStoreInArray('yourusernamehere', 'following', followingArray);
// unfollowall(followingArray);
