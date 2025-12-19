const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
 
// Middleware
app.use(cors());
app.use(express.json());
 
// Kết nối MongoDB
// Thay thế username, password, dbname bằng thông tin thực tế của bạn
// Ví dụ: mongodb+srv://MSSV:MSSV@cluster.mongodb.net/it4409
const mongoURI = "mongodb+srv://20225278:20225278@cluster0.673kgmf.mongodb.net/IT4409";
// Để chạy local nếu cần: const mongoURI = "mongodb://localhost:27017/user-management";
 
mongoose
  .connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));
 
// Schema
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
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  address: {
    type: String
  }
});
 
const User = mongoose.model("User", UserSchema);
 
// API Endpoints
 
// 1. GET - Lấy danh sách (có phân trang + tìm kiếm)
app.get("/api/users", async (req, res) => {
  try {
    // Lấy query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
 
    // Tạo query filter cho search
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } }
          ]
        }
      : {};
 
    // Tính skip
    const skip = (page - 1) * limit;
 
    // Query database song song (Promise.all)
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);
 
    const totalPages = Math.ceil(total / limit);
 
    // Trả về response
    res.json({
      page,
      limit,
      total,
      totalPages,
      data: users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// 2. POST - Tạo user mới
app.post("/api/users", async (req, res) => {
  try {
    let { name, age, email, address } = req.body;
 
    // Chuẩn hóa dữ liệu
    if (name) name = name.trim();
    if (email) email = email.trim();
    if (address) address = address.trim();
 
    // Tạo user mới
    const newUser = await User.create({ name, age, email, address });
    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: newUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
// 3. PUT - Cập nhật user
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { name, age, email, address } = req.body;
 
    // Chuẩn hóa dữ liệu
    if (name) name = name.trim();
    if (email) email = email.trim();
    if (address) address = address.trim();
 
    // Chỉ cập nhật các trường có giá trị (nếu cần thiết, nhưng ở đây ta cập nhật theo body gửi lên)
    // Tuy nhiên, để tránh ghi null cho trường thiếu thông tin nếu FE gửi thiếu, ta có thể lọc object update.
    // Nhưng theo yêu cầu bài tập, ta cứ update theo body.
 
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, age, email, address },
      { new: true, runValidators: true } // Quan trọng
    );
 
    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }
 
    res.json({
      message: "Cập nhật người dùng thành công",
      data: updatedUser
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
 
// 4. DELETE - Xóa user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
   
    // Kiểm tra ID hợp lệ (MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID không hợp lệ" });
    }
 
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
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
 
 