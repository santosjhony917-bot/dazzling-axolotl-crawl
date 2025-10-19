import { Link } from "react-router-dom";

const RestaurantLogin = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Restaurant Login Page</h1>
      <Link to="/restaurant-signup" className="text-blue-500 hover:underline mt-4">
        Go to Signup
      </Link>
    </div>
  );
};

export default RestaurantLogin;