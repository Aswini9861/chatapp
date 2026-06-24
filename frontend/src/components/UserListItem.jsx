import * as Avatar from "@radix-ui/react-avatar";


const UserListItem = ({ user, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer
        ${
          isSelected
            ? "bg-indigo-50 border-l-4 border-indigo-500"
            : "hover:bg-gray-50 border-l-4 border-transparent"
        }`}
    >
     <Avatar.Root className="h-10 w-10 ring-2 rounded-full">
        <Avatar.Image
            className="rounded-full"
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
            alt={user.username}
        />
        <Avatar.Fallback className="text-gray-800 font-bold">
            {user.username?.charAt(0)?.toUpperCase()}
        </Avatar.Fallback>
        </Avatar.Root>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-indigo-600" : "text-gray-700"}`}>
          {user.username}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {user.email}
        </p>
      </div>
    </div>
  );
};

export default UserListItem;