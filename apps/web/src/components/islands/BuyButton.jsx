import { useState } from 'react';

export default function BuyButton({ id }) {
	const [added, setAdded] = useState(false);

	return (
		<button
			type="button"
			className="inline-flex min-h-11 items-center justify-center rounded-full bg-leaf-700 px-5 text-sm font-semibold text-paper transition hover:bg-leaf-600 disabled:opacity-70"
			onClick={() => setAdded(true)}
			disabled={added}
		>
			{added ? 'Added' : 'Buy'} · {id}
		</button>
	);
}
