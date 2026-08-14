const router = require("express").Router();
const c = require("../controllers/Post.controller");
const { requireAuth, optionalAuth } = require("../middelwares/auth.middleware");

router.get("/",                                    optionalAuth, c.getFeed); // optionalAuth attaches req.user if token present
router.post("/",                                   requireAuth, c.createPost);
router.get("/mine/archived",                       requireAuth, c.getMyArchivedPosts);
router.get("/:id",                                 c.getPostById);
router.put("/:id",                                 requireAuth, c.updatePost);
router.delete("/:id",                              requireAuth, c.deletePost);
router.patch("/:id/archive",                       requireAuth, c.archivePost);
router.patch("/:id/restore",                       requireAuth, c.restorePost);
router.post("/:id/repost",                         requireAuth, c.repostPost);
router.post("/:id/like",                           requireAuth, c.toggleLike);
router.get("/:id/likes",                           c.getLikes);
router.get("/:id/liked",                           requireAuth, c.getLikedStatus);
router.get("/:id/comments",                        c.getComments);
router.post("/:id/comments",                       requireAuth, c.addComment);
router.put("/:postId/comments/:commentId",         requireAuth, c.updateComment);
router.delete("/:postId/comments/:commentId",      requireAuth, c.deleteComment);

module.exports = router;
