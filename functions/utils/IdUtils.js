const generateId = () => {
    let id = Date.now();
    id += Math.floor(Math.random() * 1000).toString();
    return id;
};

module.exports = {
    generateId
}
