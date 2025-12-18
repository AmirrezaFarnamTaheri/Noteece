use chrono::{Datelike, Local};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Quote {
    pub text: String,
    pub author: String,
}

pub fn get_daily_quote() -> Quote {
    let quotes = vec![
        ("The only way to do great work is to love what you do.", "Steve Jobs"),
        ("It always seems impossible until it's done.", "Nelson Mandela"),
        ("Don't watch the clock; do what it does. Keep going.", "Sam Levenson"),
        ("The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt"),
        ("Believe you can and you're halfway there.", "Theodore Roosevelt"),
        ("Strive not to be a success, but rather to be of value.", "Albert Einstein"),
        ("I have not failed. I've just found 10,000 ways that won't work.", "Thomas A. Edison"),
        ("Everything you've ever wanted is on the other side of fear.", "George Addair"),
        ("Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill"),
        ("The secret of getting ahead is getting started.", "Mark Twain"),
        ("Quality is not an act, it is a habit.", "Aristotle"),
        ("Life is what happens when you're busy making other plans.", "John Lennon"),
        ("The purpose of our lives is to be happy.", "Dalai Lama"),
        ("Get busy living or get busy dying.", "Stephen King"),
        ("You only live once, but if you do it right, once is enough.", "Mae West"),
        ("Many of life's failures are people who did not realize how close they were to success when they gave up.", "Thomas A. Edison"),
        ("If you want to live a happy life, tie it to a goal, not to people or things.", "Albert Einstein"),
        ("Money and success don't change people; they merely amplify what is already there.", "Will Smith"),
        ("Your time is limited, so don't waste it living someone else's life.", "Steve Jobs"),
        ("Not how long, but how well you have lived is the main thing.", "Seneca"),
    ];

    let day = Local::now().ordinal();
    let index = (day as usize) % quotes.len();
    let (text, author) = quotes[index];

    Quote {
        text: text.to_string(),
        author: author.to_string(),
    }
}
