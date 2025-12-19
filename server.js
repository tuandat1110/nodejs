const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
// Middleware
app.use(cors());
app.use(express.json());

function normalizeInput(req, res, next) {
  if (req.body.name) req.body.name = req.body.name.trim();
  if (req.body.email) req.body.email = req.body.email.trim().toLowerCase();
  if (req.body.address) req.body.address = req.body.address.trim();

  if (req.body.age !== undefined) {
    req.body.age = parseInt(req.body.age);
    if (isNaN(req.body.age) || req.body.age < 0) {
      return res.status(400).json({ error: "Age must be a positive integer" });
    }
  }

  next();
}

const { ObjectId } = mongoose.Types;
function validateId(req, res, next) {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }
  next();
}

app.use(normalizeInput);

mongoose
 .connect("mongodb+srv://20225278:20225278@cluster0.673kgmf.mongodb.net/IT4409")
 .then(() => console.log("Connected to MongoDB"))
 .catch((err) => console.error("MongoDB Error:", err));

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Tên không được để trống'],
        minlength: [2, 'Tên phải có ít nhất 2 ký tự']
    },
    age: { 
        type: Number, 
        required: [true, 'Tuổi không được để trống'],
        min: [0, 'Tuổi phải >= 0']
    },
    email: { 
        type: String, 
      required: [true, 'Email không được để trống'],
      match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
      unique: true,
      lowercase: true,
    },
    address: { 
        type: String 
    }
});

const User = mongoose.model("User", UserSchema);

User.collection.createIndex({ email: 1 }, { unique: true }).catch((err) => {
  console.warn('Index creation warning:', err.message || err);
});

app.get("/api/users", async (req, res) => {
  try {
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);
    const search = req.query.search?.trim() || "";

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 5;
    if (limit > 50) limit = 50;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: users,
    });

  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users", async (req, res) => { 
    try {
    const { name, age, email, address } = req.body;

    if (email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const newUser = await User.create({ name, age, email, address });
        res.status(201).json({
            message: "Tạo người dùng thành công",
            data: newUser
        });

    }catch(err){
    // Duplicate key (unique email) -> 409 Conflict
    if (err && (err.code === 11000 || err.codeName === 'DuplicateKey')) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    // Mongoose validation errors
    if (err && err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }

    res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.put("/api/users/:id", validateId, normalizeInput, async (req, res) => {
  try {
    const updateData = {};

    // Chỉ gán field nếu FE gửi lên
    ["name", "email", "age", "address"].forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const updated = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json(updated);
  } catch (err) {
    if (err && (err.code === 11000 || err.codeName === 'DuplicateKey')) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }
    if (err && err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/users/:id", async (req, res) => { 
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
        return res.status(404).json({ error: "Không tìm thấy người dùng" });
        }
        res.json({ message: "Xóa người dùng thành công" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Start server
app.listen(3001, () => {
 console.log("Server running on http://localhost:3001");
})