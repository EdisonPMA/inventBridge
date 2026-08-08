const router = require("express").Router();
const c = require("../controllers/Post.controller");
const { requireAuth } = require("../middelwares/auth.middleware");
const { rejectSuspended } = require("../middelwares/suspended.middleware");

router.get("/",                                    c.getFeed);                  // public
router.post("/",                                   requireAuth, rejectSuspended, c.createPost);
router.get("/mine/archived",                       requireAuth, c.getMyArchivedPosts);
router.get("/:id",                                 c.getPostById);              // public
router.put("/:id",                                 requireAuth, rejectSuspended, c.updatePost);
router.delete("/:id",                              requireAuth, c.deletePost);
router.patch("/:id/archive",                       requireAuth, c.archivePost);
router.patch("/:id/restore",                       requireAuth, c.restorePost);

// Repost
router.post("/:id/repost",                         requireAuth, rejectSuspended, c.repostPost);

// Likes
router.post("/:id/like",                           requireAuth, rejectSuspended, c.toggleLike);
router.get("/:id/likes",                           c.getLikes);
router.get("/:id/liked",                           requireAuth, c.getLikedStatus);

// Comments
router.get("/:id/comments",                        c.getComments);
router.post("/:id/comments",                       requireAuth, rejectSuspended, c.addComment);
router.put("/:postId/comments/:commentId",         requireAuth, rejectSuspended, c.updateComment);
router.delete("/:postId/comments/:commentId",      requireAuth, c.deleteComment);

module.exports = router;
