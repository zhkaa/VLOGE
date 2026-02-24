// Функционал для страницы закладок

document.addEventListener('DOMContentLoaded', function() {
    // Обработка кнопок удаления закладок
    const removeButtons = document.querySelectorAll('.bookmark-card__remove');
    
    removeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Останавливаем всплытие события
            
            const card = this.closest('.bookmark-card');
            
            // Показываем подтверждение
            if (confirm('Удалить статью из закладок?')) {
                // Анимация удаления
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    card.remove();
                    
                    // Обновляем счётчик закладок
                    updateBookmarksCount();
                }, 300);
            }
        });
    });
    
    // Обработка клика по карточке (переход к статье)
    const bookmarkCards = document.querySelectorAll('.bookmark-card');
    
    bookmarkCards.forEach(card => {
        card.addEventListener('click', function() {
            // В будущем здесь будет переход к статье
            console.log('Переход к статье');
        });
    });
    
    // Функция обновления счётчика закладок
    function updateBookmarksCount() {
        const remainingCards = document.querySelectorAll('.bookmark-card').length;
        const subtitle = document.querySelector('.profile-subtitle');
        
        if (subtitle) {
            const word = getWordForm(remainingCards);
            subtitle.textContent = `${remainingCards} ${word} в закладках`;
        }
    }
    
    // Функция для правильного склонения слова "статья"
    function getWordForm(number) {
        const lastDigit = number % 10;
        const lastTwoDigits = number % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return 'статей';
        }
        
        if (lastDigit === 1) {
            return 'статья';
        }
        
        if (lastDigit >= 2 && lastDigit <= 4) {
            return 'статьи';
        }
        
        return 'статей';
    }
});