
import {redis} from '../lib/redis.js';
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
const generateTokens=(userId)=>{
 const accessToken=jwt.sign({userId},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'15m'})

 const refreshToken=jwt.sign({userId},process.env.REFRESH_TOKEN_SECRET,{expiresIn:'7d'})
  return {accessToken,refreshToken};
};

const storeRefreshToken=async(userId,refreshToken)=>{
  await redis.set(`refresh_token:${userId}`,refreshToken,"EX",7*24*60*60);
}

const setCookies=(res,accessToken,refreshToken)=>{
  const isProduction = process.env.NODE_ENV === "production";
    res.cookie("accessToken",accessToken,{
      httpOnly:true,
      secure:isProduction ? true : false,
      sameSite:isProduction ? "none" : "lax",
      maxAge:15*60*1000,
    })
    res.cookie("refreshToken",refreshToken,{
      httpOnly:true,
      secure:isProduction ? true : false,
      sameSite:isProduction ? "none" : "lax",
      maxAge:7*24*60*60*1000,
    })
  };
export const signup = async (req, res) => {
  const {name, email, password} = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({message: "required all fields"});
    }

    if (password.length < 6) {
      return res.status(400).json({message: "password is too short!"});
    }

    const userExist = await User.findOne({email});
    if (userExist) {
      return res.status(400).json({message: "user already exist"});
    }
    const newUser = new User({name, email, password});
        await newUser.save();

    const {accessToken,refreshToken} = generateTokens(newUser._id);
    await storeRefreshToken(newUser._id, refreshToken);

    setCookies(res,accessToken,refreshToken);

    return res.status(201).json({
      user:{
      _id:newUser._id,
      name:newUser.name,
      email:newUser.email,
      role:newUser.role,
    },message: "User created successfully"});
    
  } catch (error) {
    console.log(error);
    return res.status(500).json("internal server error");
  }
};



export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }
    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);
    setCookies(res, accessToken, refreshToken);
    return res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Login successful",
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const logout=(req,res)=>{
   return  res.status(200).json({message:"logout successful"});
}

export const refreshToken=async(req,res)=>{
  try {
    const refreshToken=req.cookies.refreshToken;

    if(!refreshToken){
      return res.status(401).json({message:"no refresh token provided"});
    }
    const decoded=jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET);
    const storedToken=await redis.get(`refresh_token:${decoded.userId}`);
    if(storedToken!==refreshToken){
      return res.status(403).json({message:"invalid refresh token"});
    }
    const accessToken=jwt.sign({userId:decoded.userId},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'15m'});
    res.cookie("accessToken",accessToken,
    {httpOnly:true,
    secure: false,
    sameSite: "lax",
    maxAge:15*60*1000});
    return res.json({message:"Token refresh succesfuly"});
  } catch (error) {
    console.log(error);
    return res.status(500).json({message:"internal server error"});
  }
}


export const getProfile=async(req,res)=>{
  try {
    res.json(req.user);

  } catch (error) {
    res.status(500).json({message:"internal server error"});
  }
}