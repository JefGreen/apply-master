import fs from 'fs'
import ollama from 'ollama'


const resumeDir = 'input'
const PROMPT_RESUME_REVIEW = `
You are a helpful assistant that reviews resume.
Instead of using 'The candidate', use the 'You' pronom
- Validate spelling mistakes, phrasing and clarity
Please provide a recomandation in markdown for:
- What is good
- What needs to be improved and provide clear exemples
- Based on your knowledge, which position would better fit this resume?
`

const PROMPT_POSTING_REVIEW = `
You are a helpful assistant that reviews resume.
Use the 'You' pronom
Please provide a recomandation in markdown for:
- If the position is a good fit for the resume
- If not why
- If yes why
`

// role: 'system' | 'user' | 'assistant' | 'tool';
export function review() {
    const resume = fs.readFileSync(`${resumeDir}/resume.md`)
    if (!resume) {
        console.log('missing resume.md under input')
        return
    }

    const resumeContent = resume.toLocaleString()
    if (resumeContent === '') {
        console.log('Empty resume.md under input detected')
        return
    }

    askForResumeReview(resumeContent).then(resumeReview => {
        fs.writeFileSync(`suggestions/resume-review.md`, resumeReview)
        console.log(`   Completed Resume review...`)

        fs.readdirSync(`${resumeDir}/job_postings`).forEach(filename => {
            if (!filename.includes('.md')) {
                console.log(`Unsupported format for ${filename}`)
            }

            const jobPosting = fs.readFileSync(`${resumeDir}/job_postings/${filename}`)
            const jobPostingContent = jobPosting.toLocaleString()
            const fileNameNoExtension = filename.split('.')[0]
            if (jobPostingContent === '') {
                console.log(`   Empty posting detected: ${fileNameNoExtension}`)
            } else {
                console.log(`   Checking if you are a match for ${fileNameNoExtension}...`)
                askForJobPostingReview(resumeContent, resumeReview, jobPostingContent).then(postingReview => {
                    fs.writeFileSync(`suggestions/${fileNameNoExtension}.md`, postingReview)
                })
            }
        })

    })

}

async function askForResumeReview(resumeContent) {
    const response = await ollama.chat({
        model: 'llama3.1',
        messages: [
            {
                role: 'system', 
                content: PROMPT_RESUME_REVIEW
            },
            {
                role: 'user', 
                content: `
                Help me review this resume. 
                Please tell me: 
                - what is good
                - what could be improved and how:
                ${resumeContent}
                `
            }
        ]
    })

    return response.message.content
}

async function askForJobPostingReview(resumeContent, resumeReview, jobPostingContent) {
    const response = await ollama.chat({
        model: 'llama3.1',
        messages: [
            {
                role: 'system', 
                content: PROMPT_POSTING_REVIEW
            },
            {
                role: 'user', 
                content: `
                this is my resume:
                ${resumeContent}
                `
            },
            {
                role: 'user', 
                content: `
                this is the feedback you gave me:
                ${resumeReview}
                `
            },
            {
                role: 'user', 
                content: `
                this the job posting:
                ${jobPostingContent}
                `
            }
        ]
    })

    return response.message.content
}


console.log('Starting reviewing process...')
review()
