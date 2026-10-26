// [plain name, technical term, explanation]
const TERMS = [
  ['Forecast', 'WINDFOR', 'National wind forecast published by Elexon about 8 times a day. We use the latest one available when your order was due.'],
  ['Actual', 'FUELHH · WIND', 'Wind power actually generated, as metered by Elexon (half-hourly).'],
  ['Error', 'forecast − actual', 'Positive means wind fell short of the forecast (a shortfall). Negative means there was more wind than forecast.'],
  ['Typical miss', 'MAE', 'Average size of the error, ignoring direction. nMAE shows it as a % of average wind output.'],
  ['Forecast too high / low', 'Bias', 'Average error including direction. It shows whether forecasts lean one way.'],
  ['Big-miss sensitive error', 'RMSE', 'Like MAE, but large misses count more. If RMSE is well above MAE, there are occasional big misses.'],
  ['Safety buffer', 'P90', '90% of hours had an error below this value. Holding this much backup would have covered 9 out of 10 hours.'],
  ['Lead time', 'Forecast horizon', 'Hours between when a forecast was published and the hour it is for.'],
  ['GW / MW', 'Units', '1 GW = 1,000 MW. Values are average power over the hour.'],
]

export default function HowToRead() {
  return (
    <details className="card howto">
      <summary>How to read this page · glossary of terms</summary>
      <ol>
        <li>Choose <b>when you place your order</b> (the day before delivery) and <b>which day</b> you are buying for.</li>
        <li>The main chart compares the forecast you would have had at that time with what really happened. The shaded area is the gap.</li>
        <li>The cards and takeaways turn that gap into numbers you can plan with, such as how much backup to hold.</li>
      </ol>
      <dl>
        {TERMS.map(([plain, term, text]) => (
          <div key={plain}>
            <dt>{plain} <span className="badge">{term}</span></dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
