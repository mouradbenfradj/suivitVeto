FROM node:18

# Install basic development tools
RUN apt update && apt install -y less man-db sudo wget lsb-release ca-certificates apt-transport-https gnupg2

# Ensure default `node` user has access to `sudo`
ARG USERNAME=node
RUN echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Add PHP repository for Debian
RUN wget -q https://packages.sury.org/php/apt.gpg -O- | sudo tee /etc/apt/trusted.gpg.d/sury-php.gpg \
    && echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/sury-php.list

# Install PHP 8.1 and required PHP extensions
RUN apt update && apt install -y \
    php8.1 \
    php8.1-cli \
    php8.1-curl \
    php8.1-mbstring \
    php8.1-xml \
    php8.1-zip \
    php8.1-gd \
    php8.1-mysql \
    php8.1-sqlite3 \
    php8.1-bcmath \
    php8.1-intl \
    php8.1-fpm \
    && apt clean

# Verify PHP version
RUN php -v

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Verify Composer installation
RUN composer --version
