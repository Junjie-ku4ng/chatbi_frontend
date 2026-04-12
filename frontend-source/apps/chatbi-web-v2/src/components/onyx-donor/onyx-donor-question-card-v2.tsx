'use client'

type OnyxDonorQuestionCardV2Props = {
  title: string
  body: string
  meta?: string
}

export function OnyxDonorQuestionCardV2({ body, meta, title }: OnyxDonorQuestionCardV2Props) {
  return (
    <div className="onyx-native-donor-question-card" data-testid="onyx-native-donor-question-card">
      <div className="onyx-native-donor-question-card-title">{title}</div>
      <div className="onyx-native-donor-question-card-body">{body}</div>
      {meta ? <div className="onyx-native-donor-question-card-meta">{meta}</div> : null}
    </div>
  )
}
