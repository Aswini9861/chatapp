import userModel from "../model/userSchema.js";


export const searchUser = async(request,response)=>{
    const { query } = request.query;
  try {
    if (query){
        const users = await userModel.find({
            $or: [
              { email: { $regex: query, $options: "i" } },
              { username: { $regex: query, $options: "i" } }
            ]
          }).select("-password"); // Exclude sensitive data
          if (!users.length) {
            return response.status(200).json({success: true,users: [] });
          }

          response.status(200).json({success: true,users:users});
    }
    else{
        response.status(200).json({message: "No users found.",users:[]});
    }


  } catch (error) {
    response.status(500).json({message: "Server error" });
  }
}
