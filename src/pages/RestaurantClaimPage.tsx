import { useParams } from 'react-router-dom';

const RestaurantClaimPage = () => {
  const { claimCode } = useParams<{ claimCode: string }>();
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Claim Restaurant</h1>
      <p>Claim code: {claimCode}</p>
    </div>
  );
};

export default RestaurantClaimPage;