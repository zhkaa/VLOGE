// Функционал для страницы "Мои статьи"

document.addEventListener('DOMContentLoaded', function() {
    // Обработка кнопок редактирования
    const editButtons = document.querySelectorAll('.article-item__action--edit');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Редактировать статью');
            // В будущем здесь будет переход на страницу редактирования
        });
    });
    
    // Обработка кнопок удаления
    const deleteButtons = document.querySelectorAll('.article-item__action--delete');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const articleItem = this.closest('.article-item');
            const articleTitle = articleItem.querySelector('.article-item__title').textContent;
            
            // Показываем подтверждение
            if (confirm(`Удалить статью "${articleTitle}"?`)) {
                // Анимация удаления
                articleItem.style.opacity = '0';
                articleItem.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    articleItem.remove();
                    
                    // Обновляем счётчик статей
                    updateArticlesCount();
                }, 300);
            }
        });
    });
    
    // Обработка клика по статье (переход к просмотру)
    const articleItems = document.querySelectorAll('.article-item');
    
    articleItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Проверяем, что клик не по кнопкам действий
            if (!e.target.closest('.article-item__action')) {
                console.log('Просмотр статьи');
                // В будущем здесь будет переход к статье
            }
        });
    });
    
    // Функция обновления счётчика статей
    function updateArticlesCount() {
        const remainingArticles = document.querySelectorAll('.article-item').length;
        const subtitle = document.querySelector('.profile-subtitle');
        
        if (subtitle) {
            const publishedCount = document.querySelectorAll('.article-item__status--published').length;
            const draftCount = document.querySelectorAll('.article-item__status--draft').length;
            
            subtitle.textContent = `${publishedCount} опубликовано, ${draftCount} черновиков`;
        }
    }
});