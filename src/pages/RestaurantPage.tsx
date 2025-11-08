import { useParams } from 'react-router-dom';

const RestaurantPage = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Restaurant Page</h1>
      <p>Details for restaurant ID: {id}</p>
    </div>
  );
};

export default RestaurantPage;