const redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379,
    enable_offline_queue: false,
});

// const redisClient = redis.createClient(6379, "localhost");

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10, // 10 requests
    duration: 1, // per 1 second by IP
});

const rateLimiterMiddleware = (req, res, next) => {

    rateLimiter.consume(req.ip)
        .then(() => {
            next();
        })
        .catch(() => {
            res.status(429).send('Too Many Requests');
        });
};

module.exports = rateLimiterMiddleware;