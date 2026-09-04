import React from 'react'

const NoResult = () => {
    return (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-10 text-center">
            <img
                src="https://cdn-icons-png.flaticon.com/512/7486/7486780.png"
                className="w-20 mx-auto mb-4 opacity-70"
                alt="no-result"
            />
            <h2 className="text-xl font-semibold text-gray-700">
                No Result Found
            </h2>
            <p className="text-gray-500 mt-1">
                We couldn’t find any summary or recent email activity.
            </p>
        </div>
    )
}

export default NoResult