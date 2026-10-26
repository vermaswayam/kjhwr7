const TERMS = [
  ['Forecast', 'The official national wind forecast published by Elexon. We use the latest one that existed when your order was due.'],
  ['Actual', 'The wind power that was really generated, as metered by Elexon.'],
  ['Shortfall', 'Wind came in below the forecast. That gap has to be bought from other sources, such as gas.'],
  ['Safety buffer', 'Extra power to buy on top of the forecast so that a shortfall is covered most of the time.'],
  ['GW / MW', '1 GW (gigawatt) = 1,000 MW (megawatts). Values are average power over the hour.'],
]

export default function HowToRead() {
  return (
    <details className="card howto">
      <summary>How to read this page</summary>
      <ol>
        <li>Choose <b>when you place your order</b> (the day before delivery) and <b>which day</b> you are buying for.</li>
        <li>The main chart shows the forecast you would have had at that time (purple) next to what really happened (green). Where purple is above green, wind fell short.</li>
        <li>The cards and takeaways turn those gaps into numbers you can plan with, such as how much backup to hold.</li>
      </ol>
      <dl>
        {TERMS.map(([term, text]) => (
          <div key={term}><dt>{term}</dt><dd>{text}</dd></div>
        ))}
      </dl>
    </details>
  )
}
