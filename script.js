document.getElementById('addItem').addEventListener('click', function() {
    const input = document.getElementById('userInput');
    const newItem = input.value;
    if (newItem) {
        const li = document.createElement('li');
        li.textContent = newItem;
        document.getElementById('myList').appendChild(li);
        input.value = '';
    }
});