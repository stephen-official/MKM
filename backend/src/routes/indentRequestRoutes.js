// // import express from "express";
// // import { IndentRequest, Indent } from "../models/FlowModels.js";
// // import { authorize } from "../middleware/auth.js";

// // const router = express.Router();

// // // USER → CREATE REQUEST
// // router.post("/", authorize(["user"]), async (req, res) => {
// //   try {
// //     const { items, note } = req.body;

// //     console.log("USER:", req.user); // 👈 debug

// //     if (!req.user) {
// //       return res.status(401).json({ message: "User not authenticated" });
// //     }

// //     const data = await IndentRequest.create({
// //       userId: req.user._id || req.user.id,   // 🔥 FIX HERE
// //       godownId: req.user.godownId,
// //       items,
// //       note
// //     });

// //     res.json(data);

// //   } catch (err) {
// //     console.error("Indent Error:", err);
// //     res.status(500).json({ message: err.message });
// //   }
// // });

// // // ADMIN → GET ALL
// // router.get("/", authorize(["admin"]), async (req, res) => {
// //   const data = await IndentRequest.find()
// //     .populate("userId", "name")
// //     .populate("items.stockItemId", "name");

// //   res.json(data);
// // });

// // // ADMIN → CONVERT TO INDENT
// // router.post("/:id/convert", authorize(["admin"]), async (req, res) => {
// //   const reqData = await IndentRequest.findById(req.params.id);

// //   const indent = await Indent.create({
// //     indentNo: "IND-" + Date.now(),
// //     createdBy: reqData.userId,
// //     items: reqData.items,
// //     status: "pending"
// //   });

// //   reqData.status = "converted";
// //   await reqData.save();

// //   res.json(indent);
// // });

// // export const indentRequestRoutes = router;












// import express from "express";
// import { IndentRequest, Indent } from "../models/FlowModels.js";
// import { authorize } from "../middleware/auth.js";

// const router = express.Router();


// // ===============================
// // USER → CREATE INDENT REQUEST
// // ===============================
// router.post("/", authorize(["user"]), async (req, res) => {
//   try {
//     const { items, note } = req.body;

//     // 🔍 DEBUG (optional - remove later)
//     console.log("USER FROM TOKEN:", req.user);

//     // ❌ Safety check
//     if (!req.user || !req.user.sub) {
//       return res.status(401).json({ message: "User not authenticated properly" });
//     }

//     if (!items || items.length === 0) {
//       return res.status(400).json({ message: "Items are required" });
//     }

//     // ✅ FINAL FIX APPLIED HERE
//     const data = await IndentRequest.create({
//       userId: req.user.sub,          // ✅ CORRECT (from JWT)
//       godownId: req.user.godownId,   // ✅ must exist in token
//       items,
//       note
//     });

//     return res.status(201).json(data);

//   } catch (err) {
//     console.error("❌ Indent Create Error:", err);
//     return res.status(500).json({
//       message: "Indent request failed",
//       error: err.message
//     });
//   }
// });


// // ===============================
// // ADMIN → GET ALL REQUESTS
// // ===============================
// router.get("/", authorize(["admin"]), async (req, res) => {
//   try {
//     const data = await IndentRequest.find({ status: { $ne: "converted" } }) // ✅ hide converted
//       .populate("userId", "name")
//       .populate("godownId", "name") // ✅ ADD THIS
//       .populate("items.stockItemId", "name unitId stockGroupId");

//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch requests" });
//   }
// });


// // ===============================
// // ADMIN → CONVERT REQUEST → INDENT
// // ===============================
// router.post("/:id/convert", authorize(["admin"]), async (req, res) => {
//   try {
//     const { items } = req.body; // 👈 edited items from frontend

//     const reqData = await IndentRequest.findById(req.params.id);

//     if (!reqData) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     // ✅ USE EDITED ITEMS (NOT ORIGINAL)
//     const indentItems = items.map(it => ({
//       stockItemId: it.stockItemId,
//       orderedQty: Number(it.qty),
//       unitPrice: Number(it.price || 0),
//       amount: Number(it.qty) * Number(it.price || 0)
//     }));

//     const totalAmount = indentItems.reduce((sum, i) => sum + i.amount, 0);

//     const indent = await Indent.create({
//       indentNo: "IND-" + Date.now(),
//       createdBy: reqData.userId,
//       items: indentItems,
//       totalAmount,
//       status: "pending"
//     });

//     // ✅ mark converted (removes from UI)
//     reqData.status = "converted";
//     await reqData.save();

//     res.json(indent);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Conversion failed" });
//   }
// });

// // ===============================
// // EXPORT ROUTER (IMPORTANT)
// // ===============================
// export const indentRequestRoutes = router;





















// 18














import express from "express";
import { IndentRequest, Indent } from "../models/FlowModels.js";
import { authorize } from "../middleware/auth.js";

const router = express.Router();


// ===============================
// USER → CREATE INDENT REQUEST
// ===============================
router.post("/", authorize(["user"]), async (req, res) => {
  try {
    const { items, note, targetDate } = req.body;

    if (!req.user || !req.user.sub) {
      return res.status(401).json({ message: "User not authenticated properly" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    const data = await IndentRequest.create({
      userId: req.user.sub,
      godownId: req.user.godownId,
      items,
      note,
      targetDate
    });

    return res.status(201).json(data);

  } catch (err) {
    console.error("❌ Indent Create Error:", err);
    return res.status(500).json({
      message: "Indent request failed",
      error: err.message
    });
  }
});


// ===============================
// USER → GET MY INDENT REQUESTS
// ===============================
router.get("/me", authorize(["user"]), async (req, res) => {
  try {
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const data = await IndentRequest.find({
      userId: req.user.sub,
      godownId: req.user.godownId
    })
      .populate({
        path: "items.stockItemId",
        select: "name unitId",
        populate: {
          path: "unitId",
          select: "symbol" // ✅ THIS FIXES YOUR UNIT ISSUE
        }
      })
      .sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {
    console.error("❌ Fetch My Indents Error:", err);
    res.status(500).json({ message: "Failed to fetch your indents" });
  }
});


// ===============================
// ADMIN → GET ALL REQUESTS
// ===============================
router.get("/", authorize(["admin"]), async (req, res) => {
  try {
    // const data = await IndentRequest.find({
    //   status: { $ne: "converted" }
    // })
    const data = await IndentRequest.find()
      .populate("userId", "name")
      .populate("godownId", "name")
      .populate({
        path: "items.stockItemId",
        select: "name unitId stockGroupId",
        populate: {
          path: "unitId",
          select: "symbol" // ✅ FIX HERE ALSO
        }
      })
      .sort({ createdAt: -1 });

    res.json(data);

  } catch (err) {
    console.error("❌ Fetch All Indents Error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});


// // ===============================
// // ADMIN → CONVERT REQUEST → INDENT
// // ===============================
// router.post("/:id/convert", authorize(["admin"]), async (req, res) => {
//   try {
//     const { items } = req.body;

//     const reqData = await IndentRequest.findById(req.params.id);

//     if (!reqData) {
//       return res.status(404).json({ message: "Request not found" });
//     }

//     const indentItems = items.map(it => ({
//       stockItemId: it.stockItemId,
//       orderedQty: Number(it.qty),
//       unitPrice: Number(it.price || 0),
//       amount: Number(it.qty) * Number(it.price || 0)
//     }));

//     const totalAmount = indentItems.reduce((sum, i) => sum + i.amount, 0);

//     const indent = await Indent.create({
//       indentNo: "IND-" + Date.now(),
//       createdBy: reqData.userId,
//       items: indentItems,
//       totalAmount,
//       status: "pending"
//     });

//     reqData.status = "converted";
//     await reqData.save();

//     res.json(indent);

//   } catch (err) {
//     console.error("❌ Convert Indent Error:", err);
//     res.status(500).json({ message: "Conversion failed" });
//   }
// });


// 20



// ===============================
// USER → UPDATE INDENT REQUEST
// ===============================
router.patch("/:id", authorize(["user"]), async (req, res) => {
  try {
    const { items, note, targetDate } = req.body;

    const request = await IndentRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status === "converted") {
      return res.status(400).json({ message: "Cannot edit converted request" });
    }

    request.items = items;
    request.note = note;
    request.targetDate = targetDate;

    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});




router.patch("/:id/confirm", authorize(["admin"]), async (req, res) => {
  try {
    const request = await IndentRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = "confirmed";
    await request.save();

    res.json({ message: "Request confirmed", data: request });

  } catch (err) {
    console.error("❌ Confirm Error:", err);
    res.status(500).json({ message: "Confirmation failed" });
  }
});




// ===============================
// EXPORT ROUTER
// ===============================
export const indentRequestRoutes = router;