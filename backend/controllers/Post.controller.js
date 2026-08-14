/**
 * Post controller
 * Routes:
 *   POST   /api/posts
 *   GET    /api/posts              (public feed)
 *   GET    /api/posts/:id
 *   PUT    /api/posts/:id
 *   DELETE /api/posts/:id
 *   POST   /api/posts/:id/like     (toggle)
 *   GET    /api/posts/:id/likes
 *   GET    /api/posts/:id/comments
 *   POST   /api/posts/:id/comments
 *   PUT    /api/posts/:postId/comments/:commentId
 *   DELETE /api/posts/:postId/comments/:commentId
 */
const Post        = require("../models/Post.model");
const PostComment  = require("../models/PostComment.model");
const PostLike     = require("../models/PostLike.model");

/* â”€â”€ POST /api/posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function createPost(req, res) {
  try {
    const { content, startup_id, image_url, video_url, visibility } = req.body;
    if (!content) return res.status(400).json({ message: "content is required." });

    // Inventors must tie every post to one of their own startups
    if (req.user.role === "inventor") {
      if (!startup_id) {
        return res.status(422).json({
          message: "Founders must select a startup for every post. Choose one of your startups.",
        });
      }
      // Verify the startup belongs to this user
      const Startup = require("../models/Startup.model");
      let startup;
      try { startup = await Startup.findById(startup_id); }
      catch { return res.status(404).json({ message: "Startup not found." }); }
      if (startup.owner_id !== req.user.id) {
        return res.status(403).json({ message: "You can only post on behalf of your own startups." });
      }
    }

    // Investors may optionally tag a startup (no ownership check â€” they invest, not own)
    // Other roles (organization, admin) can post without a startup

    const post = await Post.create({
      user_id: req.user.id, content, startup_id, image_url, video_url, visibility,
      tagged_users: Array.isArray(req.body.tagged_users) ? req.body.tagged_users.map(Number).filter(Boolean) : [],
    });

    // Notify tagged users
    const taggedIds = Array.isArray(req.body.tagged_users) ? req.body.tagged_users.map(Number).filter(id => id !== req.user.id) : [];
    if (taggedIds.length) {
      const db2  = require("../config/database");
      const [[tagger]] = await db2.execute(
        `SELECT p.first_name, p.last_name FROM profiles p WHERE p.user_id = ? LIMIT 1`,
        [req.user.id]
      );
      const taggerName = tagger ? `${tagger.first_name || ""} ${tagger.last_name || ""}`.trim() || "Someone" : "Someone";
      const Notification2 = require("../models/Notification.model");
      taggedIds.forEach(uid => {
        Notification2.create({
          user_id: uid,
          title:   `${taggerName} tagged you in a post`,
          message: content.slice(0, 80),
          type:    "post",
        }).catch(() => {});
      });
    }

    return res.status(201).json({ message: "Post created.", post });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getFeed(req, res) {
  try {
    const { user_id, startup_id, search, page = 1, limit = 20 } = req.query;
    const safeLimit  = (Math.min(Math.max(parseInt(limit) || 20, 1), 50)) | 0;
    const safePage   = Math.max(parseInt(page)   || 1, 1);
    const safeOffset = ((safePage - 1) * safeLimit) | 0;

    // If search query is provided, skip personalised feed and search directly
    if (search && search.trim()) {
      const result = await Post.findAll({
        visibility: "public", search: search.trim(),
        limit: safeLimit, offset: safeOffset,
      });
      return res.json({
        success: true,
        posts: result.rows,
        data: result.rows,
        pagination: { page: safePage, limit: safeLimit, total: result.total, totalPages: Math.ceil(result.total / safeLimit) },
      });
    }

    // Use req.user attached by optionalAuth middleware — respects token_version revocation
    const viewerId = req.user?.id || null;

    let result;
    if (viewerId) {
      try {
        result = await Post.personalFeed(viewerId, { limit: safeLimit, offset: safeOffset });
      } catch (feedErr) {
        console.error("[getFeed] personalFeed failed, falling back to public feed:", feedErr.message, feedErr.code);
        // Fall back to public feed if personalized query fails
        result = await Post.findAll({
          visibility: "public",
          limit: safeLimit, offset: safeOffset,
        });
      }
    } else {
      result = await Post.findAll({
        user_id, startup_id, visibility: "public",
        limit: safeLimit, offset: safeOffset,
      });
    }

    return res.json({
      success: true,
      posts: result.rows,   // some frontend components use posts
      data:  result.rows,   // some use data
      pagination: {
        page:       safePage,
        limit:      safeLimit,
        total:      result.total,
        totalPages: Math.ceil(result.total / safeLimit),
      },
    });
  } catch (err) {
    console.error("[getFeed] error:", err.message, "code:", err.code, "sql:", err.sql?.slice(0, 200));
    return res.status(500).json({ message: "Could not load posts." });
  }
}

/* â”€â”€ GET /api/posts/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getPostById(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    return res.json({ post });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/posts/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updatePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to edit this post." });
    }
    const updated = await Post.update(req.params.id, req.body);
    return res.json({ message: "Post updated.", post: updated });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ DELETE /api/posts/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (post.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this post." });
    }
    const result = await Post.remove(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PATCH /api/posts/:id/archive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function archivePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ message: "Only the post owner can archive this post." });
    }
    const result = await Post.archive(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PATCH /api/posts/:id/restore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function restorePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ message: "Only the post owner can restore this post." });
    }
    const result = await Post.restore(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/posts/mine/archived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getMyArchivedPosts(req, res) {
  try {
    const result = await Post.findAll({
      user_id: req.user.id, visibility: "archived",
      limit: 50, offset: parseInt(req.query.offset || "0"),
    });
    return res.json({ posts: result.rows, total: result.total });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ POST /api/posts/:id/like â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function toggleLike(req, res) {
  try {
    const result = await PostLike.toggle(req.params.id, req.user.id);

    // Notify post owner (not when user likes their own post)
    if (result.liked) {
      try {
        const post = await Post.findById(req.params.id);
        if (post.user_id !== req.user.id) {
          const db           = require("../config/database");
          const Notification = require("../models/Notification.model");

          const [[liker]] = await db.execute(
            `SELECT p.first_name, p.last_name FROM profiles p WHERE p.user_id = ? LIMIT 1`,
            [req.user.id]
          );
          const likerName = liker
            ? `${liker.first_name || ""} ${liker.last_name || ""}`.trim()
            : null;

          Notification.create({
            user_id: post.user_id,
            title:   "New like on your post",
            message: likerName
              ? `${likerName} liked your post.`
              : "Someone liked your post.",
            type: "post",
          }).catch(() => {});
        }
      } catch { /* ignore notification errors */ }
    }

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/posts/:id/likes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getLikes(req, res) {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const likers = await PostLike.likersByPost(req.params.id, {
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return res.json({ likers });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/posts/:id/comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getComments(req, res) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await PostComment.findByPost(req.params.id, {
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ POST /api/posts/:id/comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function addComment(req, res) {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim())
      return res.status(400).json({ message: "comment is required." });
    if (comment.trim().length > 500)
      return res.status(422).json({ message: "Comment must be 500 characters or less." });

    const created = await PostComment.create({
      post_id: req.params.id, user_id: req.user.id, comment: comment.trim(),
    });

    // Notify post owner (not when commenting on own post)
    try {
      const post = await Post.findById(req.params.id);
      if (post.user_id !== req.user.id) {
        const db           = require("../config/database");
        const Notification = require("../models/Notification.model");

        const [[commenter]] = await db.execute(
          `SELECT p.first_name, p.last_name FROM profiles p WHERE p.user_id = ? LIMIT 1`,
          [req.user.id]
        );
        const commenterName = commenter
          ? `${commenter.first_name || ""} ${commenter.last_name || ""}`.trim()
          : null;

        Notification.create({
          user_id: post.user_id,
          title:   commenterName
            ? `${commenterName} commented on your post`
            : "New comment on your post",
          message: comment.trim().slice(0, 100),
          type:    "post",
        }).catch(() => {});
      }
    } catch { /* ignore */ }

    return res.status(201).json({ message: "Comment added.", comment: created });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/posts/:postId/comments/:commentId â”€â”€â”€â”€ */
async function updateComment(req, res) {
  try {
    const existing = await PostComment.findById(req.params.commentId);
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to edit this comment." });
    }
    const updated = await PostComment.update(req.params.commentId, req.body.comment);
    return res.json({ message: "Comment updated.", comment: updated });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ DELETE /api/posts/:postId/comments/:commentId â”€ */
async function deleteComment(req, res) {
  try {
    const existing = await PostComment.findById(req.params.commentId);
    if (existing.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this comment." });
    }
    const result = await PostComment.remove(req.params.commentId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ POST /api/posts/:id/repost â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function repostPost(req, res) {
  try {
    const original = await Post.findById(req.params.id);

    // Cannot repost your own post
    if (original.user_id === req.user.id) {
      return res.status(403).json({ message: "You cannot repost your own post." });
    }

    // Inventors must link posts to a startup â€” inherit from original
    // The original startup_id carries over automatically
    const caption    = (req.body.caption || "").trim();
    const repostText = caption
      ? `${caption}\n\nâ”€â”€â”€ Reposted from ${original.first_name || "someone"} â”€â”€â”€\n${original.content}`
      : `â”€â”€â”€ Reposted from ${original.first_name || "someone"} â”€â”€â”€\n${original.content}`;

    const post = await Post.create({
      user_id:    req.user.id,
      startup_id: original.startup_id || null,  // inherit original's startup
      content:    repostText,
      image_url:  original.image_url  || null,
      video_url:  original.video_url  || null,
      visibility: req.body.visibility || "public",
    });
    return res.status(201).json({ message: "Reposted.", post });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}
async function getLikedStatus(req, res) {
  try {
    const liked = await PostLike.isLiked(req.params.id, req.user.id);
    return res.json({ liked });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createPost, getFeed, getPostById, updatePost, deletePost, repostPost,
  archivePost, restorePost, getMyArchivedPosts,
  toggleLike, getLikes, getLikedStatus,
  getComments, addComment, updateComment, deleteComment,
};


