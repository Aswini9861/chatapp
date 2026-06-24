const IncomingCallModal = ({
  callerId,
  callType,
  onAccept,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">

        <h2 className="text-lg font-bold">
          Incoming {callType} Call
        </h2>

        <p className="mt-2">
          Caller: {callerId}
        </p>

        <div className="flex gap-3 mt-4">

          <button
            onClick={onAccept}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Accept
          </button>

          <button
            onClick={onReject}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Reject
          </button>

        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;