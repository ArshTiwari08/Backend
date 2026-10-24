import { User } from "../models/User.js";

const createUser = async (req, res) => {
    try {
        const { name, age, city, work } = req.body;

        const newUser = await User.create({
            name,
            age,
            city,
            work
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: newUser
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export { createUser };