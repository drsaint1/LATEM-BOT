const { RateLimiterMemory } = require('rate-limiter-flexible');
const { LIMITS, MESSAGES } = require('../../utils/constants');

class RateLimiter {
    constructor() {
        this.tipLimiter = new RateLimiterMemory({
            keyPrefix: 'tip_limit',
            points: LIMITS.RATE_LIMIT_MAX,
            duration: LIMITS.RATE_LIMIT_WINDOW / 1000,
        });
        
        this.commandLimiter = new RateLimiterMemory({
            keyPrefix: 'cmd_limit',
            points: 60,
            duration: 60,
        });
        
        this.dailyTipTracker = new Map();
    }

    async checkTipRateLimit(telegramId) {
        try {
            await this.tipLimiter.consume(telegramId);
            return { allowed: true };
        } catch (rateLimiterRes) {
            const totalHitsInWindow = rateLimiterRes.totalHits;
            const msBeforeNext = rateLimiterRes.msBeforeNext;
            
            return {
                allowed: false,
                error: MESSAGES.RATE_LIMITED,
                retryAfter: Math.round(msBeforeNext / 1000) || 1
            };
        }
    }

    async checkCommandRateLimit(telegramId) {
        try {
            await this.commandLimiter.consume(telegramId);
            return { allowed: true };
        } catch (rateLimiterRes) {
            return {
                allowed: false,
                error: 'Too many commands. Please slow down.',
                retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 1
            };
        }
    }

    checkDailyTipLimit(telegramId, amount) {
        const today = new Date().toDateString();
        const key = `${telegramId}_${today}`;
        
        const currentDaily = this.dailyTipTracker.get(key) || 0;
        const newTotal = currentDaily + amount;
        
        if (newTotal > LIMITS.MAX_DAILY_AMOUNT) {
            return {
                allowed: false,
                error: `Daily limit exceeded. You can tip $${LIMITS.MAX_DAILY_AMOUNT - currentDaily} more today.`,
                remaining: LIMITS.MAX_DAILY_AMOUNT - currentDaily
            };
        }
        
        this.dailyTipTracker.set(key, newTotal);
        
        setTimeout(() => {
            this.dailyTipTracker.delete(key);
        }, 24 * 60 * 60 * 1000);
        
        return { allowed: true, dailyTotal: newTotal };
    }

    async middleware(telegramId, commandType = 'general') {
        const commandCheck = await this.checkCommandRateLimit(telegramId);
        if (!commandCheck.allowed) {
            return commandCheck;
        }
        
        if (commandType === 'tip') {
            const tipCheck = await this.checkTipRateLimit(telegramId);
            if (!tipCheck.allowed) {
                return tipCheck;
            }
        }
        
        return { allowed: true };
    }

    getRemainingPoints(telegramId) {
        return this.tipLimiter.get(telegramId);
    }

    reset(telegramId) {
        this.tipLimiter.delete(telegramId);
        this.commandLimiter.delete(telegramId);
        
        const today = new Date().toDateString();
        const key = `${telegramId}_${today}`;
        this.dailyTipTracker.delete(key);
    }
}

const rateLimiter = new RateLimiter();

module.exports = rateLimiter;